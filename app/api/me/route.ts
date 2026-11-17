import { api, requireGate, requirePassenger } from "@/lib/metro/security";
import { passengers } from "@/lib/metro/fixtures";
import { storageMode } from "@/lib/metro/store";
export async function GET() {
  return api(async () => {
    await requireGate();
    let passenger = null;
    try {
      passenger = await requirePassenger();
    } catch {}
    return {
      passenger,
      profiles: process.env.DEMO_MODE === "true" ? passengers : [],
      demo_mode: process.env.DEMO_MODE === "true",
      storage: storageMode(),
      live_enabled: process.env.GEMINI_LIVE_ENABLED === "true",
    };
  });
}
