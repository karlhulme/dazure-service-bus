import { assertRejects } from "../deps.ts";

import {
  convertServiceBusKeyToCryptoKey,
  postMessagesToQueue,
} from "../src/serviceBus/index.ts";

function getEnvVars() {
  const testServiceBusUrl = Deno.env.get("SBUS_URL");

  if (!testServiceBusUrl) {
    throw new Error("SBUS_URL is not defined.");
  }

  const testPolicyName = Deno.env.get("SBUS_POLICY_NAME");

  if (!testPolicyName) {
    throw new Error("SBUS_POLICY_NAME is not defined.");
  }

  return {
    testServiceBusUrl,
    testPolicyName,
  };
}

function getServiceBusCryptoKey() {
  const testPolicyKey = Deno.env.get("SBUS_POLICY_KEY");

  if (!testPolicyKey) {
    throw new Error("SBUS_POLICY_KEY is not defined.");
  }

  return convertServiceBusKeyToCryptoKey(testPolicyKey);
}

Deno.test("A text message can be posted to a queue.", async () => {
  const envVars = getEnvVars();
  const cryptoKey = await getServiceBusCryptoKey();

  await postMessagesToQueue({
    serviceBusUri: envVars.testServiceBusUrl,
    queueName: "test",
    cryptoKey,
    sharedAccessPolicyName: envVars.testPolicyName,
    messages: [{
      content: "This is a text message",
      brokerProperties: {
        TimeToLiveTimeSpan: "0.00:10:00",
      },
      userProperties: {
        Priority: "Medium",
      },
    }],
  });
});

Deno.test("A JSON message can be posted to a queue.", async () => {
  const envVars = getEnvVars();
  const cryptoKey = await getServiceBusCryptoKey();

  await postMessagesToQueue({
    serviceBusUri: envVars.testServiceBusUrl,
    queueName: "test",
    cryptoKey,
    sharedAccessPolicyName: envVars.testPolicyName,
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
  });
});

Deno.test("A message with an invalid policy name cannot be posted to a queue.", async () => {
  const envVars = getEnvVars();
  const cryptoKey = await getServiceBusCryptoKey();

  await assertRejects(() =>
    postMessagesToQueue({
      serviceBusUri: envVars.testServiceBusUrl,
      queueName: "test",
      cryptoKey,
      sharedAccessPolicyName: "invalid",

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
