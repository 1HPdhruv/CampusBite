import type { Language } from "../schemas";
export type ToolEvidence = { name: string; result: unknown };
// Deterministic text guard; unknown/stale prices can never be recovered from model memory.
export function groundReply(
  reply: string,
  evidence: ToolEvidence[],
  language: Exclude<Language, "auto">,
) {
  const ta = language === "ta-IN";
  const fare = evidence.filter((e) => e.name === "getFare").at(-1)?.result as
    Record<string, unknown> | undefined;
  if (fare) {
    const source = String(
      fare.source_url ?? "https://chennaimetrorail.org/cmrl-fare-table/",
    );
    const checked = String(fare.verified_at ?? "unknown");
    if (fare.verified !== true)
      return `${ta ? "கட்டணம் சரிபார்க்கப்படவில்லை. ஊகித்த தொகையை வழங்க முடியாது. அதிகாரப்பூர்வ CMRL அட்டவணையைப் பார்க்கவும்." : "Fare not verified. I cannot supply a guessed price. Check the official CMRL fare table."}\n${source}\n${ta ? "சரிபார்த்த நாள்" : "Last checked"}: ${checked}`;
    return `${ta ? "வெளியிடப்பட்ட சாதாரண கட்டணம்" : "Published standard fare"}: ₹${fare.standard}\n${ta ? "வெளியிடப்பட்ட 20% தள்ளுபடி கட்டணம்" : "Published 20% discounted fare"}: ₹${fare.discounted}\n${ta ? "அமலுக்கு வரும் தேதி தெரியவில்லை; தற்போதைய தகுதியை CMRL உடன் உறுதிசெய்யவும்." : "Effective date is not established; confirm current eligibility with CMRL."}\n${source}\n${String(fare.discounted_source_url)}\n${ta ? "சரிபார்த்த நாள்" : "Last checked"}: ${checked}`;
  }
  const lost = evidence.find((e) => e.name === "getLostCardPolicy")?.result as
    Record<string, unknown> | undefined;
  if (lost)
    return `${ta ? lost.answer_ta : lost.answer}\n${lost.source_url}\n${ta ? "சரிபார்த்த நாள்" : "Last checked"}: ${lost.verified_at}`;
  const station = evidence.find(
    (e) =>
      e.name === "getStationInfo" &&
      (e.result as { station?: unknown })?.station === null,
  );
  if (station)
    return ta
      ? "இந்த நிலையம் சரிபார்த்த பதிவுகளில் இல்லை. வழித்தடத்தை ஊகிக்க முடியாது. https://chennaimetrorail.org/"
      : "This station is not in the checked records. I cannot invent a route. https://chennaimetrorail.org/";
  if (
    evidence.some((e) => (e.result as { is_demo?: boolean })?.is_demo === true)
  )
    return `${reply}\n\n${ta ? "மாதிரி தரவு — உண்மையான CMRL இருப்பு அல்லது பரிவர்த்தனை அல்ல." : "Demo data — not a live CMRL balance or transaction."}`;
  return reply;
}
