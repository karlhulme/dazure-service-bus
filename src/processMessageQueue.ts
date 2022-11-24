import { delay } from "../deps.ts";
import { pullMessageFromQueue } from "./pullMessageFromQueue.ts";
import { deleteMessageFromQueue } from "./deleteMessageFromQueue.ts";
import { PeekedMessage } from "./PeekedMessage.ts";
import { createCachedSharedAccessAuthHeader } from "./createCachedSharedAccessAuthHeader.ts";

/**
 * By default process one message at a time.
 */
const DEFAULT_MAX_CONCURRENT_MESSAGES = 1;

/**
 * The number of milliseconds to wait before checking to see if
 * we have the capacity to poll for messages again.
 */
const MAX_MESSAGES_WAIT_IN_MILLISECONDS = 1000 * 1;

/**
 * The amount of time to wait before trying to reconnect to the
 * service bus queue after a retrieve message error.
 */
const RETRIEVE_MESSAGE_FAILURE_WAIT_IN_MILLISECONDS = 1000 * 30;

/**
 * The properties for processing the message queue.
 */
interface ProcessMessageQueueProps<Message> {
  /**
   * A signal that indicates when the processing should be aborted.
   */
  signal?: AbortSignal;

  /**
   * The maximum number of messages to process concurrently.
   */
  maxConcurrentMessages?: number;

  /**
   * The url of the service bus instance, for example
   * https://my-app.servicebus.windows.net
   */
  serviceBusUrl: string;

  /**
   * The name of the queue to process.
   */
  serviceBusQueueName: string;

  /**
   * The name of the shared access policy that is used
   * to access the queue.
   */
  serviceBusPolicyName: string;

  /**
   * The crypto key that conains the service bus key.
   * Typically produced using the convertServiceBusKeyToCryptoKey function.
   */
  cryptoKey: CryptoKey;

  /**
   * The number of milliseconds remaining on an authorisation header
   * before it is regenerated.  This should be considerably longer
   * than the message lock time defined for the queue.
   */
  expiryWindowTimeInMilliseconds?: number;

  /**
   * A handler function that will process the message.  If
   * the handler raises an error that the message will not
   * be removed the queue and it will be processed again.
   * Note that a successfully processed message may be
   * processed a second time, because the guarantee is
   * at-least once delivery. The handler needs to process
   * the message within the message lock duration time which
   * is 30 seconds by default but can be changed on the
   * Azure portal.
   */
  handler: (msg: Message) => Promise<void>;
}

/**
 * Processes a message queue, invoking the given handler for
 * each received message at least once.
 * @param props A property bag.
 */
export async function processMessageQueue<Message>(
  props: ProcessMessageQueueProps<Message>,
): Promise<void> {
  const msgProcPromises: Promise<void>[] = [];
  const maxConcurrentMessages = props.maxConcurrentMessages ||
    DEFAULT_MAX_CONCURRENT_MESSAGES;

  while (!props.signal || !props.signal?.aborted) {
    if (msgProcPromises.length < maxConcurrentMessages) {
      try {
        const authorizationHeader = await createCachedSharedAccessAuthHeader(
          props.serviceBusUrl,
          props.serviceBusPolicyName,
          props.cryptoKey,
          props.expiryWindowTimeInMilliseconds,
        );

        const msg = await pullMessageFromQueue<Message>({
          signal: props.signal,
          authorizationHeader,
          serviceBusUrl: props.serviceBusUrl,
          serviceBusQueueName: props.serviceBusQueueName,
        });

        if (msg) {
          // Start the processing of the message and store the promise in an array.
          const msgProcPromise = processMessage(
            props.serviceBusUrl,
            props.serviceBusQueueName,
            authorizationHeader,
            msg,
            props.handler,
          );
          msgProcPromises.push(msgProcPromise);

          // When the promise is settled, remove it from the array.
          msgProcPromise.finally(() => {
            const index = msgProcPromises.indexOf(msgProcPromise);
            msgProcPromises.splice(index, 1);
          });
        }
      } catch {
        // Ignore errors when retrieving messages and keep running, but allow the
        // service some to recover.
        await delay(RETRIEVE_MESSAGE_FAILURE_WAIT_IN_MILLISECONDS);
      }
    } else {
      await delay(MAX_MESSAGES_WAIT_IN_MILLISECONDS);
    }
  }

  // Finish processing any active messages.
  const outstandingMsgProcPromises = Array.from(msgProcPromises.values());
  await Promise.allSettled(outstandingMsgProcPromises);
}

/**
 * Processes an individual message from the queue.  If the processing
 * is successful then the message will be deleted from the queue.
 * @param serviceBusUrl The url to the service bus.
 * @param serviceBusQueueName The name of the service bus queue.
 * @param authHeader An authorisation header for communicating
 * with the service bus.
 * @param msg The message to process.
 * @param handler The supplied handler that will process the
 * message or raise an error.
 */
async function processMessage<Message>(
  serviceBusUrl: string,
  serviceBusQueueName: string,
  authHeader: string,
  msg: PeekedMessage<Message>,
  handler: (msg: Message) => Promise<void>,
): Promise<void> {
  try {
    await handler(msg.content);

    await deleteMessageFromQueue({
      authorizationHeader: authHeader,
      serviceBusUrl,
      serviceBusQueueName: serviceBusQueueName,
      messageId: msg.messageId,
      lockToken: msg.lockToken,
    });
  } catch (err) {
    // An error during message processing will prevent that message from
    // being removed.  After X deliveries the queue will move it to the
    // dead-letter queue automatically.  This will also happen if the source
    // is not recognised.
    console.log((err as Error).message, msg);
  }
}
