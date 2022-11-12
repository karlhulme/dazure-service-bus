import { assertRejects } from "../deps.ts";

import {
  convertServiceBusKeyToCryptoKey,
  postMessageToQueue,
} from "../src/serviceBus/index.ts";

const testServiceBusUrl = Deno.env.get("SBUS_URL");

if (!testServiceBusUrl) {
  throw new Error("SBUS_URL is not defined.");
}

const testPolicyName = Deno.env.get("SBUS_POLICY_NAME");

if (!testPolicyName) {
  throw new Error("SBUS_POLICY_NAME is not defined.");
}

const testPolicyKey = Deno.env.get("SBUS_POLICY_KEY");

if (!testPolicyKey) {
  throw new Error("SBUS_POLICY_KEY is not defined.");
}

console.log("Importing key.");
const cryptoKey = await convertServiceBusKeyToCryptoKey(testPolicyKey);

Deno.test("A message can be posted to a queue.", async () => {
  await postMessageToQueue({
    serviceBusUri: testServiceBusUrl,
    queueName: "test",
    cryptoKey,
    sharedAccessPolicyName: testPolicyName,
    messages: [{
      content: {
        hello: "world",
      },
      brokerProperties: {
        TimeToLiveTimeSpan: "0.00:10:00",
        ContentType: "application/json",
      },
      userProperties: {
        Priority: "Medium",
      },
    }],
  });
});

Deno.test("A message with an invalid policy name cannot be posted to a queue.", async () => {
  await assertRejects(() =>
    postMessageToQueue({
      serviceBusUri: testServiceBusUrl,
      queueName: "test",
      cryptoKey,
      sharedAccessPolicyName: "invalid",
      messages: [{
        content: {
          hello: "world",
        },
        brokerProperties: {
          TimeToLiveTimeSpan: "0.00:10:00",
          ContentType: "application/json",
        },
        userProperties: {
          Priority: "Medium",
        },
      }],
    })
  );
});
