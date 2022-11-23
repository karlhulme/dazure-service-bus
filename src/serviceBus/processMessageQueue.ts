import { delay } from "../../deps.ts";
import { pullMessageFromQueue } from "./pullMessageFromQueue.ts";
import { deleteMessageFromQueue } from "./deleteMessageFromQueue.ts";
import { PeekedMessage } from "./PeekedMessage.ts";

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

interface ProcessMessageQueueProps<Message> {
  signal?: AbortSignal;
  maxConcurrentMessages?: number;
  serviceBusUri: string;
  serviceBusQueueName: string;
  serviceBusAuthHeader: string;
  handler: (msg: Message) => Promise<void>;
}

export async function processMessageQueue<Message>(
  props: ProcessMessageQueueProps<Message>,
): Promise<void> {
  const msgProcPromises: Promise<void>[] = [];
  const maxConcurrentMessages = props.maxConcurrentMessages ||
    DEFAULT_MAX_CONCURRENT_MESSAGES;

  while (!props.signal || !props.signal?.aborted) {
    if (msgProcPromises.length < maxConcurrentMessages) {
      try {
        const msg = await pullMessageFromQueue<Message>({
          signal: props.signal,
          authorizationHeader: props.serviceBusAuthHeader,
          serviceBusUri: props.serviceBusUri,
          queueName: props.serviceBusQueueName,
        });

        if (msg) {
          // Start the processing of the message and store the promise in an array.
          const msgProcPromise = processMessage(props, msg);
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

async function processMessage<Message>(
  queueProps: ProcessMessageQueueProps<Message>,
  msg: PeekedMessage<Message>,
): Promise<void> {
  try {
    await queueProps.handler(msg.content);

    await deleteMessageFromQueue({
      authorizationHeader: queueProps.serviceBusAuthHeader,
      serviceBusUri: queueProps.serviceBusUri,
      queueName: queueProps.serviceBusQueueName,
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
