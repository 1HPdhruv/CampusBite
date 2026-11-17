import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, signValue, cookieOptions } from "@/lib/auth";
import {
  assertOrigin,
  rateLimit,
  readJson,
  api,
  ApiError,
} from "@/lib/metro/security";
const schema = z.object({ passcode: z.string().min(1).max(200) }).strict();
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    rateLimit("login-global", 20);
    const expected = process.env.APP_PASSCODE?.trim();
    if (!expected) throw new ApiError("AUTH_NOT_CONFIGURED", 503);
    const p = schema.safeParse(await readJson(request));
    if (!p.success || p.data.passcode.trim() !== expected)
      throw new ApiError("INVALID_PASSCODE", 401);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      await signValue("gate", true),
      cookieOptions,
    );
    return response;
  });
}
