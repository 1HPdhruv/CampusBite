import "server-only";
import { cookies } from "next/headers";
import {
  isValidSession,
  SESSION_COOKIE,
  PASSENGER_COOKIE,
  verifyValue,
} from "../auth";
import { passengers } from "./fixtures";
export class ApiError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Next may normalize request.url to an internal localhost hostname. The browser's
  // Host header preserves the public authority; browser JavaScript cannot override it.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  let valid = false;
  try {
    const u = new URL(origin ?? "");
    valid =
      ["https:", "http:"].includes(u.protocol) &&
      u.host === host &&
      u.origin === origin;
  } catch {}
  if (!valid || request.headers.get("sec-fetch-site") === "cross-site")
    throw new ApiError("INVALID_ORIGIN", 403);
}
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max = 20, now = Date.now()) {
  if (buckets.size > 5000)
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + 60000 });
    return;
  }
  if (++b.count > max) throw new ApiError("RATE_LIMITED", 429);
}
export async function requireGate() {
  const jar = await cookies();
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value)))
    throw new ApiError("SIGN_IN_REQUIRED", 401);
  return jar;
}
export async function requirePassenger() {
  const jar = await requireGate();
  if (process.env.DEMO_MODE !== "true")
    throw new ApiError("PRODUCTION_AUTH_REQUIRED", 403);
  const id = await verifyValue<string>(
    jar.get(PASSENGER_COOKIE)?.value,
    "passenger",
  );
  const p = passengers.find((p) => p.id === id);
  if (!p) throw new ApiError("SELECT_DEMO_PASSENGER", 401);
  return p;
}
export async function readJson(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 40000)
    throw new ApiError("BODY_TOO_LARGE", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("INVALID_REQUEST");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 40000) {
        await reader.cancel();
        throw new ApiError("BODY_TOO_LARGE", 413);
      }
      chunks.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    throw new ApiError("INVALID_JSON");
  }
}
export async function api(action: () => Promise<unknown>) {
  try {
    const result = await action();
    if (result instanceof Response) {
      result.headers.set("Cache-Control", "no-store");
      return result;
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const known = e instanceof ApiError;
    return Response.json(
      { error: known ? e.code : "SERVICE_UNAVAILABLE" },
      {
        status: known ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
