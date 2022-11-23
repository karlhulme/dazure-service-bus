import { PeekedMessage } from "./PeekedMessage.ts";

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
   * An abort controller to abandon the message pull.
   */
  signal?: AbortSignal;

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
      signal: props.signal,
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
