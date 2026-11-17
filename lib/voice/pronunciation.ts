import { stations } from "../metro/official";
// Original Metro-specific speech-only normalization. No upstream hospital code copied.
// Displayed captions, stored descriptions and numeric values are never modified.
export function normalizeForSpeech(text: string, language: string) {
  let spoken = text.replace(
    /https?:\/\/[^\s]+/g,
    language === "ta-IN"
      ? "அதிகாரப்பூர்வ இணையதள இணைப்பு"
      : "official website link",
  );
  const expansions: Record<string, string> =
    language === "ta-IN"
      ? { CMRL: "சி எம் ஆர் எல்", NCMC: "என் சி எம் சி", UPI: "யூ பி ஐ" }
      : { CMRL: "C M R L", NCMC: "N C M C", UPI: "U P I" };
  spoken = spoken.replace(/\b(CMRL|NCMC|UPI)\b/g, (m) => expansions[m]);
  spoken = spoken.replace(
    /₹\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g,
    (_, amount: string) =>
      `${amount} ${language === "ta-IN" ? "ரூபாய்" : "rupees"}`,
  );
  if (language === "ta-IN")
    for (const station of stations) {
      if (station.name_ta)
        spoken = spoken.replace(
          new RegExp(`\\b${station.name_en}\\b`, "gi"),
          station.name_ta,
        );
    }
  return spoken;
}
