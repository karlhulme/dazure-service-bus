import { assertRejects } from "../deps.ts";
import {
  deleteMessageFromQueue,
  postMessagesToQueue,
  pullMessageFromQueue,
} from "../src/index.ts";
import { getEnvVars } from "./shared.test.ts";

Deno.test("Using an invalid authorisation header prevents a message from being posted to a queue.", async () => {
  const envVars = getEnvVars();

  await assertRejects(() =>
    postMessagesToQueue({
      authorizationHeader: "invalid",
      serviceBusUri: envVars.testServiceBusUrl,
      queueName: "test",
      messages: [{
        content: {
          hello: "world",
        },
        brokerProperties: {
          TimeToLiveTimeSpan: "0.00:10:00",
        },
        userProperties: {
          Priority: "Medium",
        },
      }],
    })
  );
});

Deno.test("Using an invalid authorisation header prevents a message from being pulled from a queue.", async () => {
  const envVars = getEnvVars();

  await assertRejects(() =>
    pullMessageFromQueue({
      authorizationHeader: "invalid",
      serviceBusUri: envVars.testServiceBusUrl,
      queueName: "test",
      // Use default timeout to cover that test.
    })
  );
});

Deno.test("Using an invalid authorisation header prevents a message from being deleted from a queue.", async () => {
  const envVars = getEnvVars();

  await assertRejects(() =>
    deleteMessageFromQueue({
      authorizationHeader: "invalid",
      serviceBusUri: envVars.testServiceBusUrl,
      queueName: "test",
      lockToken: "123",
      messageId: "123",
    })
  );
});
