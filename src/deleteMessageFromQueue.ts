/**
 * The properties to delete a message.
 */
export interface DeleteMessageFromQueueProps {
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
   * The id of the message to delete.
   */
  messageId: string;

  /**
   * The lock token of a message to delete.
   */
  lockToken: string;
}

/**
 * Delete a message from the queue.
 * @param props A property bag.
 */
export async function deleteMessageFromQueue(
  props: DeleteMessageFromQueueProps,
): Promise<void> {
  const response = await fetch(
    `${props.serviceBusUri}/${props.queueName}/messages/${props.messageId}/${props.lockToken}`,
    {
      method: "DELETE",
      headers: {
        Authorization: props.authorizationHeader,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Unable to delete message ${props.serviceBusUri}/${props.queueName}/${props.messageId}. (${response.status})\n${await response
        .text()}`,
    );
  }

  response.body?.cancel();
}
