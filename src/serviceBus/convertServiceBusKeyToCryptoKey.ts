/**
 * Converts the given service bus key to a CryptoKey
 * that can be used for signing requests.
 * @param serviceBusKey A service bus primary or secondary key.
 */
export async function convertServiceBusKeyToCryptoKey(
  serviceBusKey: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(serviceBusKey);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );

  return cryptoKey;
}
