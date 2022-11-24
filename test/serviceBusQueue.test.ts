import { assertEquals, assertRejects } from "../deps.ts";
import {
  clearSharedAccessAuthHeaderCache,
  createCachedSharedAccessAuthHeader,
  deleteMessageFromQueue,
  postMessagesToQueue,
  pullMessageFromQueue,
} from "../src/index.ts";
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

Deno.test("A shared access auth header is cached with explicit expiry window and validity time.", async () => {
  const envVars = getEnvVars();
  const cryptoKey = await getServiceBusCryptoKey();

  clearSharedAccessAuthHeaderCache();

  const header = await createCachedSharedAccessAuthHeader(
    envVars.testServiceBusUrl,
    envVars.testPolicyName,
    cryptoKey,
    undefined, // not used if a new key is generated
    1000 * 60, // create with 60 seconds of validity
  );

  await sleep(1000);

  const header2 = await createCachedSharedAccessAuthHeader(
    envVars.testServiceBusUrl,
    envVars.testPolicyName,
    cryptoKey,
    1000 * 10, // renew when less than 10 seconds validity remaining
    undefined, // not used if an existing key is found.
  );

  assertEquals(header, header2);
});

Deno.test("A message can be posted to a queue, pulled from a queue and then deleted.", async () => {
  await drainQueue();

  const envVars = getEnvVars();
  const authHeader = await getAuthHeader();

  await postMessagesToQueue<HelloMessage>({
    authorizationHeader: authHeader,
    serviceBusUrl: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
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
    serviceBusUrl: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
    timeoutInSeconds: 300,
  });

  assertEquals(msg!.content, {
    hello: "world",
  });

  await deleteMessageFromQueue({
    authorizationHeader: authHeader,
    serviceBusUrl: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
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
    serviceBusUrl: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
    timeoutInSeconds: 30,
  });

  await sleep(5 * 1000);

  await postMessagesToQueue<LateMessage>({
    authorizationHeader: authHeader,
    serviceBusUrl: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
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
      serviceBusUrl: envVars.testServiceBusUrl,
      serviceBusQueueName: "test",
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
