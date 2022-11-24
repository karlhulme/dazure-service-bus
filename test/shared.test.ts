import {
  convertServiceBusKeyToCryptoKey,
  createSharedAccessAuthHeader,
  deleteMessageFromQueue,
  pullMessageFromQueue,
} from "../src/index.ts";

export function getEnvVars() {
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

export function getServiceBusCryptoKey() {
  const testPolicyKey = Deno.env.get("SBUS_POLICY_KEY");

  if (!testPolicyKey) {
    throw new Error("SBUS_POLICY_KEY is not defined.");
  }

  return convertServiceBusKeyToCryptoKey(testPolicyKey);
}

export async function getAuthHeader() {
  const envVars = getEnvVars();
  const cryptoKey = await getServiceBusCryptoKey();

  return createSharedAccessAuthHeader(
    envVars.testServiceBusUrl,
    envVars.testPolicyName,
    cryptoKey,
    1000 * 60 * 15, // 15 minutes
  );
}

export function sleep(seconds: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({});
    }, seconds);
  });
}

export async function drainQueue() {
  const envVars = getEnvVars();
  const authHeader = await getAuthHeader();

  while (true) {
    const msg = await pullMessageFromQueue({
      authorizationHeader: authHeader,
      serviceBusUri: envVars.testServiceBusUrl,
      queueName: "test",
      timeoutInSeconds: 1, // Short timeout because we just want messages already present.
    });

    if (msg) {
      await deleteMessageFromQueue({
        authorizationHeader: authHeader,
        serviceBusUri: envVars.testServiceBusUrl,
        queueName: "test",
        messageId: msg.messageId,
        lockToken: msg.lockToken,
      });
    } else {
      // no more messages to delete
      return;
    }
  }
}
