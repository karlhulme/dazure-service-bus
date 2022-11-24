import { createSharedAccessAuthHeader } from "./createSharedAccessAuthHeader.ts";

/**
 * The amount of time that should be remaining on the authorisation
 * header before a new header is built.  Currently 3 minutes.
 */
const DEFAULT_EXPIRY_WINDOW_IN_MILLISECONDS = 1000 * 60 * 3;

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
 * Empties the cache of shared access auth headers.
 */
export function clearSharedAccessAuthHeaderCache() {
  cache.clear();
}

/**
 * Returns a string that can be used as the Authorization
 * header when making a request to a service bus service.
 * The policy should be registered with the given serviceUrl.
 * If the policy is registered with a specific queue or topic
 * then the serviceUrl must also reference the specific queue
 * or topic.  This function will return a cached header if there
 * is more than EXPIRY_WINDOW_IN_MILLISECONDS remaining on the
 * header.
 * @param serviceBusUrl The uri to the service bus resource, for example
 * https://app-name.servicebus.windows.net.
 * @param sharedAccessPolicyName The name of a shared access policy.
 * @param cryptoKey A crypto key.
 * @param expiryWindowTimeInMilliseconds The number of milliseconds remaining
 * on an authorisation header before it is regenerated.
 * @param validityTimeInMilliseconds The number of milliseconds that the header
 * should be valid for.  If not supplied, then the service bus
 * recommended default of 15 minutes is used.
 */
export async function createCachedSharedAccessAuthHeader(
  serviceBusUrl: string,
  sharedAccessPolicyName: string,
  cryptoKey: CryptoKey,
  expiryWindowTimeInMilliseconds?: number,
  validityTimeInMilliseconds?: number,
) {
  const cacheKey = `${serviceBusUrl}#${sharedAccessPolicyName}`;

  const cachedItem = cache.get(cacheKey);

  if (cachedItem) {
    const cutoffTimestamp = Date.now() +
      (expiryWindowTimeInMilliseconds || DEFAULT_EXPIRY_WINDOW_IN_MILLISECONDS);

    // Check that the header is due to expire after our cut-off.
    if (cachedItem.expiryTimestamp > cutoffTimestamp) {
      return cachedItem.authHeader;
    }
  }

  const validityTimeInMillisecondsOrDefault = validityTimeInMilliseconds ||
    DEFAULT_VALIDITY_IN_MILLISECONDS;

  const newHeader = await createSharedAccessAuthHeader(
    serviceBusUrl,
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
