import {
  api,
  assertOrigin,
  requirePassenger,
  rateLimit,
  readJson,
} from "@/lib/metro/security";
import { dispatchLiveTools } from "@/lib/voice/server";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const actor = await requirePassenger();
    rateLimit(`live-tools:${actor.id}`, 24);
    return dispatchLiveTools(actor.id, await readJson(request));
  });
}
