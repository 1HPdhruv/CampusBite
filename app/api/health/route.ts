import { safeHealth } from "@/lib/metro/health";
import { getSupabase } from "@/lib/supabase";
export async function GET() {
  const health = safeHealth(process.env);
  let database = "not_used";
  if (health.storage === "supabase")
    try {
      const { error } = await getSupabase()
        .from("metro_passengers")
        .select("id")
        .limit(1)
        .abortSignal(AbortSignal.timeout(3000));
      database = error ? "unavailable" : "reachable";
    } catch {
      database = "unavailable";
    }
  return Response.json(
    {
      ...health,
      database,
      ready:
        health.settings.APP_PASSCODE &&
        health.demo_mode &&
        (health.storage === "memory" || database === "reachable"),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
