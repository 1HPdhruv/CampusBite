import { NextResponse } from "next/server";
import { SESSION_COOKIE, PASSENGER_COOKIE } from "@/lib/auth";
import { api, assertOrigin } from "@/lib/metro/security";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const r = NextResponse.json({ ok: true });
    r.cookies.delete(SESSION_COOKIE);
    r.cookies.delete(PASSENGER_COOKIE);
    return r;
  });
}
