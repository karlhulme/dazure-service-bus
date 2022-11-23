import { assertEquals, assertRejects } from "../deps.ts";
import {
  createCachedSharedAccessAuthHeader,
  deleteMessageFromQueue,
  postMessagesToQueue,
  pullMessageFromQueue,
} from "../src/serviceBus/index.ts";
import {
  drainQueue,
  getAuthHeader,
  getEnvVars,
  getServiceBusCryptoKey,
  sleep,
} from "./shared.test.ts";

interface HelloMessage {
  hello: string;
}

interface LateMessage {
  late: string;
}

Deno.test("A share access auth header is cached.", async () => {
  const envVars = getEnvVars();
  const cryptoKey = await getServiceBusCryptoKey();

  const header = await createCachedSharedAccessAuthHeader(
    envVars.testServiceBusUrl,
    envVars.testPolicyName,
    cryptoKey,
  );

  await sleep(1000);

  const header2 = await createCachedSharedAccessAuthHeader(
    envVars.testServiceBusUrl,
    envVars.testPolicyName,
    cryptoKey,
  );

  assertEquals(header, header2);
});

Deno.test("A message can be posted to a queue, pulled from a queue and then deleted.", async () => {
  await drainQueue();

  const envVars = getEnvVars();
  const authHeader = await getAuthHeader();

  await postMessagesToQueue<HelloMessage>({
    authorizationHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    queueName: "test",
    messages: [{
      content: {
        hello: "world",
      },
      brokerProperties: {
        TimeToLiveTimeSpan: "0.00:30:00",
      },
    }],
  });

  const msg = await pullMessageFromQueue<HelloMessage>({
    authorizationHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    queueName: "test",
    timeoutInSeconds: 300,
  });

  assertEquals(msg!.content, {
    hello: "world",
  });

  await deleteMessageFromQueue({
    authorizationHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    queueName: "test",
    messageId: msg!.messageId,
    lockToken: msg!.lockToken,
  });
});

Deno.test("A pull request will wait for a message to arrive.", async () => {
  await drainQueue();

  const envVars = getEnvVars();
  const authHeader = await getAuthHeader();

  // Initiate the pull request but do not wait on it
  // because there is nothing for it to receive yet.
  const pullPromise = pullMessageFromQueue<LateMessage>({
    authorizationHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    queueName: "test",
    timeoutInSeconds: 30,
  });

  await sleep(5 * 1000);

  await postMessagesToQueue<LateMessage>({
    authorizationHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    queueName: "test",
    messages: [{
      content: {
        late: "msg",
      },
    }],
  });

  const msg = await pullPromise;

  assertEquals(msg?.content, {
    late: "msg",
  });
});

Deno.test("Using an invalid authorisation header prevents a message from being posted to a queue.", async () => {
  const envVars = getEnvVars();

  await assertRejects(() =>
    postMessagesToQueue<HelloMessage | LateMessage>({
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
