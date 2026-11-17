export function providerErrorCode(
  error: unknown,
): "AI_QUOTA" | "AI_TIMEOUT" | "AI_CONFIGURATION" | "AI_UNAVAILABLE" {
  const e = error as {
    status?: number;
    message?: string;
    name?: string;
  } | null;
  const status = e?.status;
  // Inspect only to classify; never log/serialize provider messages or request URLs.
  const message = typeof e?.message === "string" ? e.message : "";
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message))
    return "AI_QUOTA";
  if (
    status === 408 ||
    status === 504 ||
    /abort|timeout|timed out/i.test(message)
  )
    return "AI_TIMEOUT";
  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    /Missing environment variable/i.test(message)
  )
    return "AI_CONFIGURATION";
  return "AI_UNAVAILABLE";
}
