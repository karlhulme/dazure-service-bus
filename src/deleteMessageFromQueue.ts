/**
 * The properties to delete a message.
 */
export interface DeleteMessageFromQueueProps {
  /**
   * A header generated using the createSharedAccessAuthHeader function.
   */
  authorizationHeader: string;

  /**
   * The url to the service bus resource.
   */
  serviceBusUrl: string;

  /**
   * The name of a queue.
   */
  serviceBusQueueName: string;

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
    `${props.serviceBusUrl}/${props.serviceBusQueueName}/messages/${props.messageId}/${props.lockToken}`,
    {
      method: "DELETE",
      headers: {
        Authorization: props.authorizationHeader,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Unable to delete message ${props.serviceBusUrl}/${props.serviceBusQueueName}/${props.messageId}. (${response.status})\n${await response
        .text()}`,
    );
  }

  response.body?.cancel();
}
