/**
 * The default number of seconds to wait for a new message
 * to arrive before the pull message request returns null.
 */
const DEFAULT_TIMEOUT_IN_SECONDS = 60;

/**
 * The properties to dequeue a set of messages.
 */
export interface PullMessageFromQueueProps {
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
   * The amount of time to wait for a message to become available.
   */
  timeoutInSeconds?: number;
}

/**
 * Represents a message pulled from a queue but not yet deleted.
 */
export interface PeekedMessage<Content> {
  /**
   * The id of the message.
   */
  messageId: string;

  /**
   * The lock token that can be used to delete the message
   * once successfully processed.
   */
  lockToken: string;

  /**
   * The content of the message.
   */
  content: Content;
}

/**
 * Pulls the next message from the queue.
 * @param props A property bag.
 */
export async function pullMessageFromQueue<Content>(
  props: PullMessageFromQueueProps,
): Promise<PeekedMessage<Content> | null> {
  const timeoutInSecs = props.timeoutInSeconds || DEFAULT_TIMEOUT_IN_SECONDS;

  const response = await fetch(
    `${props.serviceBusUri}/${props.queueName}/messages/head?timeout=${timeoutInSecs}`,
    {
      method: "POST",
      headers: {
        Authorization: props.authorizationHeader,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Unable to query for messages from ${props.serviceBusUri}/${props.queueName}/messages/head. (${response.status})\n${await response
        .text()}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  const brokerProperties = JSON.parse(
    response.headers.get("BrokerProperties")!,
  ) as {
    MessageId: string;
    LockToken: string;
  };

  return {
    messageId: brokerProperties.MessageId,
    lockToken: brokerProperties.LockToken,
    content: await response.json(),
  };
}
