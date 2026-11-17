export const SESSION_COOKIE = "app_session";
export const PASSENGER_COOKIE = "metro_passenger";
const encoder = new TextEncoder();
async function signature(payload: string) {
  const secret = process.env.APP_PASSCODE?.trim();
  if (!secret) throw new Error("AUTH_NOT_CONFIGURED");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function signValue(kind: string, value: unknown, seconds = 43200) {
  const payload = btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify({ kind, value, exp: Date.now() + seconds * 1000 }),
      ),
    ),
  );
  return `${payload}.${await signature(payload)}`;
}
export async function verifyValue<T>(
  token: string | undefined,
  kind: string,
): Promise<T | null> {
  if (!token || token.length > 6000) return null;
  try {
    const [payload, mac, extra] = token.split(".");
    if (extra || !mac) return null;
    const expected = await signature(payload);
    let diff = expected.length ^ mac.length;
    for (let i = 0; i < expected.length; i++)
      diff |= expected.charCodeAt(i) ^ (mac.charCodeAt(i) || 0);
    if (diff) return null;
    const data = JSON.parse(decodeURIComponent(escape(atob(payload))));
    return data.kind === kind && data.exp > Date.now()
      ? (data.value as T)
      : null;
  } catch {
    return null;
  }
}
export async function isValidSession(value: string | undefined) {
  return (await verifyValue(value, "gate")) === true;
}
export const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 43200,
};
