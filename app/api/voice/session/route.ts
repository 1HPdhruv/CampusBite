import { z } from "zod";
import {
  api,
  assertOrigin,
  requirePassenger,
  rateLimit,
  readJson,
  ApiError,
} from "@/lib/metro/security";
import { languageSchema } from "@/lib/schemas";
import { mintLiveSession } from "@/lib/voice/server";
export const runtime = "nodejs";
export const maxDuration = 15;
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const actor = await requirePassenger();
    rateLimit(`live-session:${actor.id}`, 3);
    rateLimit("live-session-global", 12);
    const p = z
      .object({ language: languageSchema })
      .strict()
      .safeParse(await readJson(request));
    if (!p.success) throw new ApiError("INVALID_REQUEST");
    return mintLiveSession(actor.id, p.data.language);
  });
}
