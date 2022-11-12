import { createSharedAccessAuthHeader } from "./createSharedAccessAuthHeader.ts";
import { serviceBusRetryable } from "./serviceBusRetryable.ts";

export interface PostMessagesToQueueProps {
  serviceBusUri: string;
  queueName: string;
  sharedAccessPolicyName: string;
  cryptoKey: CryptoKey;
  messages: PostMessagesToQueuePropsMessage[];
}

export interface PostMessagesToQueuePropsMessage {
  content: Record<string, unknown>;
  brokerProperties?: PostMessagesToQueueMessageBrokerProperties;
  userProperties?: Record<string, string>;
}

export interface PostMessagesToQueueMessageBrokerProperties {
  CorrelationId?: string;
  ContentType?: "application/json";
  Label?: string;
  PartitionKey?: string;
  SessionId?: string;
  TimeToLiveTimeSpan?: string;
}

/**
 * Posts a message to a queue.  Returns false if the document
 * does not exist.  In all other cases an error is raised.
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
            Body: JSON.stringify(m.content),
            BrokerProperties: m.brokerProperties,
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
