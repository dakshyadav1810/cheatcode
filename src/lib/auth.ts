export const AUTH_COOKIE = "cc_auth";

// Cookie value is a hash of the passphrase, so rotating APP_PASSPHRASE logs everyone out.
export async function authToken(passphrase: string) {
  const data = new TextEncoder().encode(`cheatcode:${passphrase}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
