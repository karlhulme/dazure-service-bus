import { createSharedAccessAuthHeader } from "./createSharedAccessAuthHeader.ts";
import { serviceBusRetryable } from "./serviceBusRetryable.ts";

/**
 * The properties to enqueue a set of messages.
 */
export interface PostMessagesToQueueProps {
  /**
   * The uri to the service bus resource.
   */
  serviceBusUri: string;

  /**
   * The name of a queue.
   */
  queueName: string;

  /**
   * The name of a shared access policy.
   */
  sharedAccessPolicyName: string;

  /**
   * A crypto key generated based on the key of the named
   * shared access policy.
   */
  cryptoKey: CryptoKey;

  /**
   * An array of messages to enqueue.
   */
  messages: PostMessagesToQueuePropsMessage[];
}

/**
 * A message to be enqueued.
 */
export interface PostMessagesToQueuePropsMessage {
  /**
   * The content of the message.  If a non-string is specified
   * then it will be passed to JSON.stringify.
   */
  content: Record<string, unknown> | string;

  /**
   * The broker properties for the message.
   */
  brokerProperties?: PostMessagesToQueueMessageBrokerProperties;

  /**
   * The custom user properties for the message.
   */
  userProperties?: Record<string, string>;
}

/**
 * The broker properties.
 */
export interface PostMessagesToQueueMessageBrokerProperties {
  /**
   * The correlation id.
   */
  CorrelationId?: string;

  /**
   * The label for the message.
   */
  Label?: string;

  /**
   * The partition key for the message.
   */
  PartitionKey?: string;

  /**
   * The id of the session.
   */
  SessionId?: string;

  /**
   * The length of time that the message should live.
   */
  TimeToLiveTimeSpan?: string;
}

/**
 * Posts a message to a queue.  Returns false if the document
 * does not exist.  In all other cases an error is raised.
 * @param props A property bag.
 */
export async function postMessagesToQueue(
  props: PostMessagesToQueueProps,
): Promise<void> {
  const authHeader = await createSharedAccessAuthHeader(
    props.serviceBusUri,
    props.sharedAccessPolicyName,
    props.cryptoKey,
  );

  await serviceBusRetryable(async () => {
    const response = await fetch(
      `${props.serviceBusUri}/${props.queueName}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/vnd.microsoft.servicebus.json",
        },
        body: JSON.stringify(
          props.messages.map((m) => ({
            Body: typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content),
            BrokerProperties: {
              ...m.brokerProperties,
              ContentType: typeof m.content === "string"
                ? "text/plain; charset=UTF-8"
                : "application/json",
            },
            UserProperties: m.userProperties,
          })),
        ),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Unable to post message to ${props.serviceBusUri}/${props.queueName}/messages. (${response.status})\n${await response
          .text()}`,
      );
    }

    await response.body?.cancel();
  });
}
