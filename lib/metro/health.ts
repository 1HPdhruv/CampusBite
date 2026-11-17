export function safeHealth(env: Record<string, string | undefined>) {
  const settings = Object.fromEntries(
    [
      "APP_PASSCODE",
      "GEMINI_API_KEY",
      "SUPABASE_URL",
      "SUPABASE_SECRET_KEY",
    ].map((k) => [k, Boolean(env[k]?.trim())]),
  );
  return {
    settings,
    demo_mode: env.DEMO_MODE === "true",
    storage: env.METRO_STORAGE === "supabase" ? "supabase" : "memory",
    voice:
      env.GEMINI_LIVE_ENABLED === "true"
        ? "live_optional_with_browser_fallback"
        : "browser",
    production_auth: "not_implemented",
    provider: "not_probed",
  };
}
