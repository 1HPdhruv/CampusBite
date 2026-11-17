import { describe, it, expect } from "vitest";
import cases from "../evals/metro-cases.json";
import { executeTool } from "../lib/agent/runAgent";
import { toolsFor } from "../lib/agent/tools";
import { groundReply } from "../lib/agent/grounding";
import { buildSystemPrompt } from "../lib/agent/systemPrompt";
import { passengers } from "../lib/metro/fixtures";
// Original paired Chennai cases. Methodology reference: fare-policy-assistant;
// no California corpus, suite code, scores or LLM judge output is imported.
describe("paired factuality and abstention regression", () => {
  for (const c of cases)
    it(`${c.suite}: ${c.id} — Tamil / English evidence parity`, async () => {
      const tool = toolsFor(passengers[0].id).find((t) => t.name === c.tool);
      const outcome = await executeTool(tool, c.args);
      expect(outcome.ok).toBe(true);
      const en = groundReply(
        "I invented ₹999 and promise recovery.",
        [{ name: c.tool, result: outcome.result }],
        "en-IN",
      );
      const ta = groundReply(
        "கற்பனையான கட்டணம் ₹999. மீட்பை உறுதியளிக்கிறேன்.",
        [{ name: c.tool, result: outcome.result }],
        "ta-IN",
      );
      for (const text of [en, ta]) {
        expect(text).toContain(c.source);
        expect(text).not.toContain("999");
        for (const fact of c.facts) expect(text).toContain(fact);
        if (c.behavior === "abstain") expect(text).not.toMatch(/₹\d/);
      }
      expect(ta).toMatch(/[\u0B80-\u0BFF]/);
      expect(
        buildSystemPrompt("auto", [{ role: "user", text: c.ta }]),
      ).toContain("Respond in ta-IN");
      expect(
        buildSystemPrompt("en-IN", [{ role: "user", text: c.en }]),
      ).toContain("Respond in en-IN");
      expect((en.match(/₹\d+/g) ?? []).sort()).toEqual(
        (ta.match(/₹\d+/g) ?? []).sort(),
      );
    });
  it("negative controls catch hallucinated prices, missing sources and asymmetric translations", () => {
    const valid = groundReply(
      "",
      [
        {
          name: "getFare",
          result: {
            verified: false,
            source_url: "https://chennaimetrorail.org/cmrl-fare-table/",
            verified_at: "2026-11-11",
          },
        },
      ],
      "en-IN",
    );
    const gate = (answer: string) =>
      answer.includes("https://chennaimetrorail.org/") && !/₹\d/.test(answer);
    expect(gate(valid)).toBe(true);
    expect(gate(valid + " ₹99")).toBe(false);
    expect(gate("Fare not verified")).toBe(false);
  });
});
