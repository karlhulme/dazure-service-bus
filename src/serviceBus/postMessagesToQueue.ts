import { serviceBusRetryable } from "./serviceBusRetryable.ts";

/**
 * The properties to enqueue a set of messages.
 */
export interface PostMessagesToQueueProps {
  /**
   * A header generated using the createSharedAccessAuthHeader function.
   */
  authorizationHeader: string;

  /**
   * The uri to the service bus resource.
   */
  serviceBusUri: string;

  /**
   * The name of a queue.
   */
  queueName: string;

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
   * The content of the message that will be JSON.stringified.
   */
  content: unknown;

  /**
   * The broker properties for the message.
   */
  brokerProperties?: PostMessagesToQueueMessageBrokerProperties;

  /**
   * The custom user properties for the message.  We currently don't
   * extract these because we can't easily distinguish between user
   * properties and regular headers.
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
 * Posts an array of messages to a queue.
 * @param props A property bag.
 */
export async function postMessagesToQueue(
  props: PostMessagesToQueueProps,
): Promise<void> {
  await serviceBusRetryable(async () => {
    const response = await fetch(
      `${props.serviceBusUri}/${props.queueName}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: props.authorizationHeader,
          "Content-Type": "application/vnd.microsoft.servicebus.json",
        },
        body: JSON.stringify(
          props.messages.map((m) => ({
            Body: JSON.stringify(m.content),
            BrokerProperties: {
              ...m.brokerProperties,
              ContentType: "application/json",
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
