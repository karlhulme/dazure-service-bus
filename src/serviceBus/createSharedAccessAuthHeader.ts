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
 * @param validityTimeInMilliseconds The number of milliseconds that the header
 * should be valid for.
 */
export async function createSharedAccessAuthHeader(
  serviceBusUri: string,
  sharedAccessPolicyName: string,
  cryptoKey: CryptoKey,
  validityTimeInMilliseconds: number,
) {
  const encodedUri = encodeURIComponent(serviceBusUri);
  const expiryInSeconds = Math.round(
    (Date.now() + validityTimeInMilliseconds) / 1000,
  );
  const signature = encodedUri + "\n" + expiryInSeconds;

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
    "&se=" + expiryInSeconds +
    "&skn=" + sharedAccessPolicyName;
}
