import { createSharedAccessAuthHeader } from "./createSharedAccessAuthHeader.ts";

/**
 * The amount of time that should be remaining on the authorisation
 * header before a new header is built.  Currently 3 minutes.
 */
const EXPIRY_WINDOW_IN_MILLISECONDS = 1000 * 60 * 3;

/**
 * The amount of time that a header should remain valid.
 * Currently 15 minutes.
 */
const DEFAULT_VALIDITY_IN_MILLISECONDS = 1000 * 60 * 15;

/**
 * Represents a shared access auth header that has been built
 * and cached previously.
 */
interface CachedAuthHeader {
  /**
   * The timestamp (milliseconds since unix epoch) when the
   * built authorisation header will expire.
   */
  expiryTimestamp: number;

  /**
   * The authorisation header that can be used when making
   * requests to the ServiceBus.
   */
  authHeader: string;
}

/**
 * The cache of auth headers that have been produced.
 */
const cache = new Map<string, CachedAuthHeader>();

/**
 * Returns a string that can be used as the Authorization
 * header when making a request to a service bus service.
 * The policy should be registered with the given serviceUri.
 * If the policy is registered with a specific queue or topic
 * then the serviceUri must also reference the specific queue
 * or topic.  This function will return a cached header if there
 * is more than EXPIRY_WINDOW_IN_MILLISECONDS remaining on the
 * header.
 * @param serviceBusUri The uri to the service bus resource, such as
 * https://<resource-name>.servicebus.windows.net.
 * @param sharedAccessPolicyName The name of the shared access policy.
 * @param cryptoKey A crypto key.
 * @param validityTimeInMilliseconds The number of milliseconds that the header
 * should be valid for.  If not supplied, then the service bus
 * recommended default of 15 minutes is used.
 */
export async function createCachedSharedAccessAuthHeader(
  serviceBusUri: string,
  sharedAccessPolicyName: string,
  cryptoKey: CryptoKey,
  validityTimeInMilliseconds?: number,
) {
  const cacheKey = `${serviceBusUri}#${sharedAccessPolicyName}`;

  const cachedItem = cache.get(cacheKey);

  if (cachedItem) {
    const cutoffTimestamp = Date.now() + EXPIRY_WINDOW_IN_MILLISECONDS;

    // Check that the header is due to expire after our cut-off.
    if (cachedItem.expiryTimestamp > cutoffTimestamp) {
      return cachedItem.authHeader;
    }
  }

  const validityTimeInMillisecondsOrDefault = validityTimeInMilliseconds ||
    DEFAULT_VALIDITY_IN_MILLISECONDS;

  const newHeader = await createSharedAccessAuthHeader(
    serviceBusUri,
    sharedAccessPolicyName,
    cryptoKey,
    validityTimeInMillisecondsOrDefault,
  );

  cache.set(
    cacheKey,
    {
      expiryTimestamp: Date.now() + validityTimeInMillisecondsOrDefault,
      authHeader: newHeader,
    },
  );

  return newHeader;
}
