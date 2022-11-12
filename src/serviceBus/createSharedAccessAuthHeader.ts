import { encodeBase64 } from "../../deps.ts";

/**
 * Returns a string that can be used as the Authorization
 * header when making a request to a service bus service.
 * The policy should be registered with the given serviceUri.
 * If the policy is registered with a specific queue or topic
 * then the serviceUri must also reference the specific queue
 * or topic.
 * @param serviceBusUri The uri to the service bus resource, such as
 * https://<resource-name>.servicebus.windows.net.
 * @param sharedAccessPolicyName The name of the shared access policy.
 * @param cryptoKey A crypto key.
 * @param validityTimeInSeconds The number of seconds that the header
 * should be valid for.  If not supplied, then the service bus
 * recommended default of 15 minutes is used.
 */
export async function createSharedAccessAuthHeader(
  serviceBusUri: string,
  sharedAccessPolicyName: string,
  cryptoKey: CryptoKey,
  validityTimeInSeconds?: number,
) {
  const encodedUri = encodeURIComponent(serviceBusUri);
  const ttlInSeconds = validityTimeInSeconds || (60 * 15); // 15 minutes by default.
  const expiry = Math.round(Date.now() / 1000) + ttlInSeconds;
  const signature = encodedUri + "\n" + expiry;

  const encoder = new TextEncoder();
  const signatureBuffer = encoder.encode(signature);

  const signatureHash = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    signatureBuffer,
  );

  const encodedSignatureHash = encodeURIComponent(
    encodeBase64(signatureHash),
  );

  return "SharedAccessSignature sr=" + encodedUri +
    "&sig=" + encodedSignatureHash +
    "&se=" + expiry +
    "&skn=" + sharedAccessPolicyName;
}
