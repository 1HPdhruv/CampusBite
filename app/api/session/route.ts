import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  assertOrigin,
  requireGate,
  readJson,
  ApiError,
  rateLimit,
} from "@/lib/metro/security";
import { passengers } from "@/lib/metro/fixtures";
import { signValue, PASSENGER_COOKIE, cookieOptions } from "@/lib/auth";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    await requireGate();
    rateLimit("session-global", 60);
    if (process.env.DEMO_MODE !== "true")
      throw new ApiError("PRODUCTION_AUTH_REQUIRED", 403);
    const p = z
      .object({ fixture: z.string().uuid() })
      .strict()
      .safeParse(await readJson(request));
    if (!p.success || !passengers.some((a) => a.id === p.data.fixture))
      throw new ApiError("INVALID_DEMO_PROFILE");
    const r = NextResponse.json({ ok: true });
    r.cookies.set(
      PASSENGER_COOKIE,
      await signValue("passenger", p.data.fixture),
      cookieOptions,
    );
    return r;
  });
}
