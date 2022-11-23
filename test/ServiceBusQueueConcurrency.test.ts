import { assert, delay } from "../deps.ts";
import {
  postMessagesToQueue,
  processMessageQueue,
} from "../src/serviceBus/index.ts";
import { drainQueue, getAuthHeader, getEnvVars } from "./shared.test.ts";

interface NumberedMessage {
  id: number;
}

Deno.test("A queue can process one message at a time by default.", async () => {
  await drainQueue();

  const envVars = getEnvVars();
  const authHeader = await getAuthHeader();

  // Test with 3 messages
  for (let i = 1; i <= 3; i++) {
    await postMessagesToQueue<NumberedMessage>({
      authorizationHeader: authHeader,
      serviceBusUri: envVars.testServiceBusUrl,
      queueName: "test",
      messages: [{
        content: {
          id: i,
        },
      }],
    });
  }

  const ops: string[] = [];

  const abortController = new AbortController();

  const processingMsgQueue = processMessageQueue<NumberedMessage>({
    signal: abortController.signal,
    serviceBusAuthHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
    handler: async (msg) => {
      ops.push(`${msg.id} START`);
      await delay(3000);
      ops.push(`${msg.id} FINISH`);
    },
  });

  while (ops.length < 6) {
    await delay(1000);
  }

  abortController.abort();
  await processingMsgQueue;

  // the messages may not be processed in order but we should get START->FINISH processing.
  assert(ops[0].endsWith("START"));
  assert(ops[1].endsWith("FINISH"));
  assert(ops[2].endsWith("START"));
  assert(ops[3].endsWith("FINISH"));
  assert(ops[4].endsWith("START"));
  assert(ops[5].endsWith("FINISH"));
});

Deno.test("A queue can process multiple messages concurrently up to a specified maximum.", async () => {
  await drainQueue();

  const envVars = getEnvVars();
  const authHeader = await getAuthHeader();

  // Test with 3 messages, 2 to run concurrently, and one to be made to wait.
  for (let i = 1; i <= 3; i++) {
    await postMessagesToQueue<NumberedMessage>({
      authorizationHeader: authHeader,
      serviceBusUri: envVars.testServiceBusUrl,
      queueName: "test",
      messages: [{
        content: {
          id: i,
        },
      }],
    });
  }

  const ops: string[] = [];

  const abortController = new AbortController();

  const processingMsgQueue = processMessageQueue<NumberedMessage>({
    signal: abortController.signal,
    serviceBusAuthHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
    maxConcurrentMessages: 2,
    handler: async (msg) => {
      ops.push(`${msg.id} START`);
      await delay(3000);
      ops.push(`${msg.id} FINISH`);
    },
  });

  while (ops.length < 6) {
    await delay(1000);
  }

  abortController.abort();
  await processingMsgQueue;

  // the first two messages should start concurrently.
  assert(ops[0].endsWith("START"));
  assert(ops[1].endsWith("START"));

  // the third message should start only when one of the previous messages has finished
  const firstFinishIndex = ops.findIndex((op) => op.endsWith("FINISH"));
  const thirdMessageStartIndex = ops.findIndex((op) => op === "3 FINISH");
  assert(thirdMessageStartIndex > firstFinishIndex);
});

Deno.test("A message that throws an error will be considered processed (although left in the queue for redelivery) and the process pump can resolve.", async () => {
  await drainQueue();

  const envVars = getEnvVars();
  const authHeader = await getAuthHeader();

  await postMessagesToQueue<NumberedMessage>({
    authorizationHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    queueName: "test",
    messages: [{
      content: {
        id: -1,
      },
    }],
  });

  let finished = false;

  const abortController = new AbortController();

  const processingMsgQueue = processMessageQueue<NumberedMessage>({
    signal: abortController.signal,
    serviceBusAuthHeader: authHeader,
    serviceBusUri: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
    // deno-lint-ignore require-await
    handler: async (msg) => {
      finished = true;
      throw new Error("Cannot process " + msg.id);
    },
  });

  while (!finished) {
    await delay(1000);
  }

  abortController.abort();

  // If the handling of error is correct, then the processing will be able to complete.
  await processingMsgQueue;
});

Deno.test("Keep polling the service bus even if the connection fails.", async () => {
  await drainQueue();

  const envVars = getEnvVars();
  const authHeader = await getAuthHeader();

  const abortController = new AbortController();

  // Use an invalid auth header to cause the polling to fail, but it should keep trying.
  const processingMsgQueue = processMessageQueue<NumberedMessage>({
    signal: abortController.signal,
    serviceBusAuthHeader: authHeader + "invalid",
    serviceBusUri: envVars.testServiceBusUrl,
    serviceBusQueueName: "test",
    handler: async () => {},
  });

  await (delay(5000));

  abortController.abort();

  await processingMsgQueue;
});
