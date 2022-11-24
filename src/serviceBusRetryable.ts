import { retryable } from "../deps.ts";

/**
 * The default retry strategy for service bus operations.
 */
export const ServiceBusDefaultRetryStrategy: number[] = [
  100,
  200,
  1000,
  2000,
];

/**
 * Executes the given operation using the service bus retry strategy.
 * This should be used for any functions where a transient failure
 * would result in a fatal issue further up the stack, so typically
 * for posting messages but not for pulling messages.
 * @param operation An asynchronous operation that interacts with
 * an Azure Service Bus resource.
 */
export function serviceBusRetryable<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return retryable(operation, {
    retryIntervalsInMilliseconds: ServiceBusDefaultRetryStrategy,
  });
}
