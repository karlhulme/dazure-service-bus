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
