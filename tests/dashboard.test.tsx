// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Dashboard from "../components/Dashboard";
import {
  passengers,
  cards,
  recharges,
  transactions,
} from "../lib/metro/fixtures";
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true,
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      const data =
        path === "/api/me"
          ? {
              passenger: passengers[0],
              profiles: passengers,
              storage: "memory",
              demo_mode: true,
            }
          : path === "/api/cards"
            ? { cards: [cards[0]], recharges: [recharges[0]] }
            : path === "/api/transactions"
              ? {
                  transactions: transactions.filter(
                    (t) => t.passenger_id === passengers[0].id,
                  ),
                }
              : { tickets: [] };
      return { ok: true, json: async () => data };
    }),
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
});
async function render() {
  await act(async () => root.render(<Dashboard />));
}
function button(text: string) {
  const b = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  );
  expect(Boolean(b)).toBe(true);
  return b!;
}
it("renders usable text chat and disclosure when speech is unsupported", async () => {
  await render();
  expect(container.textContent).toContain(
    "Simulated demo data — not a live CMRL balance",
  );
  await act(async () => button("Talk to MetroSathi").click());
  expect(container.textContent).toContain("Voice recognition is unavailable");
  const input = container.querySelector<HTMLTextAreaElement>("#chat");
  expect(input?.disabled).toBe(false);
  expect(input?.getAttribute("maxlength")).toBe("4000");
});
it("microphone denial and unmount abort recognition while retaining text chat", async () => {
  let last: FakeRecognition | undefined;
  const abort = vi.fn();
  class FakeRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend = null;
    constructor() {
      last = this;
    }
    start = vi.fn();
    abort = abort;
  }
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: FakeRecognition,
  });
  await render();
  await act(async () => button("Talk to MetroSathi").click());
  expect(last?.lang).toBe("en-IN");
  await act(async () => last?.onerror?.({ error: "not-allowed" }));
  expect(container.textContent).toContain("Microphone permission was denied");
  expect(abort).toHaveBeenCalled();
  expect(container.querySelector<HTMLTextAreaElement>("#chat")?.disabled).toBe(
    false,
  );
  await act(async () => button("Talk to MetroSathi").click());
  const count = abort.mock.calls.length;
  await act(async () => root.unmount());
  expect(abort.mock.calls.length).toBeGreaterThan(count);
});
it("switches Tamil labels and opens support form without writing", async () => {
  await render();
  const language = container.querySelector<HTMLSelectElement>("#language")!;
  await act(async () => {
    language.value = "ta-IN";
    language.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(container.textContent).toContain("மாதிரி தரவு");
  expect(document.documentElement.lang).toBe("ta-IN");
  await act(async () => button("ஆதரவு மையம்").click());
  expect(container.textContent).toContain("CMRL க்கு புகார் அனுப்பப்படாது");
  expect(
    Array.from(container.querySelectorAll("button")).some((b) =>
      b.textContent?.includes("கோரிக்கையைச் சரிபார்"),
    ),
  ).toBe(true);
  expect(
    (fetch as ReturnType<typeof vi.fn>).mock.calls.some(
      (call) => call[0] === "/api/tickets/prepare",
    ),
  ).toBe(false);
});
it("shows and focuses ticket summary, cancels safely, and writes only after confirm", async () => {
  const original = vi.mocked(fetch).getMockImplementation()!;
  let created = false;
  const proposal = {
    draft: {
      category: "recharge",
      description: "Synthetic card update is pending after demo payment",
      cardId: cards[0].id,
      language: "en-IN",
    },
    confirmation: "signed-test-summary",
    expires_in: 600,
    notice: "Prototype only",
  };
  const ticket = {
    ...proposal.draft,
    id: crypto.randomUUID(),
    passenger_id: passengers[0].id,
    ticket_number: "MS-DEMO-UI-TEST",
    status: "open",
    is_demo: true,
    created_at: new Date().toISOString(),
  };
  vi.mocked(fetch).mockImplementation(async (path, options) => {
    if (path === "/api/agent")
      return {
        ok: true,
        json: async () => ({
          reply: "Please review the prototype ticket summary.",
          steps: [{ tool: "prepareSupportTicket", ok: true }],
          proposal,
        }),
      } as Response;
    if (path === "/api/tickets" && options?.method === "POST") {
      created = true;
      return { ok: true, json: async () => ({ ticket }) } as Response;
    }
    if (path === "/api/tickets" && created)
      return {
        ok: true,
        json: async () => ({ tickets: [ticket] }),
      } as Response;
    return original(path, options);
  });
  await render();
  await act(async () => button("My recharge is pending").click());
  expect(container.textContent).toContain(proposal.draft.description);
  expect(document.activeElement?.getAttribute("aria-labelledby")).toBe(
    "confirmation-title",
  );
  expect(created).toBe(false);
  await act(async () => button("Cancel").click());
  expect(container.querySelector(".confirmation")).toBeNull();
  expect(created).toBe(false);
  await act(async () => button("My recharge is pending").click());
  await act(async () => button("Confirm & create prototype ticket").click());
  expect(created).toBe(true);
  expect(container.textContent).toContain("MS-DEMO-UI-TEST");
  expect(container.querySelector(".confirmation")).toBeNull();
  const writes = vi
    .mocked(fetch)
    .mock.calls.filter(
      (c) => c[0] === "/api/tickets" && c[1]?.method === "POST",
    );
  expect(writes).toHaveLength(1);
  const body = JSON.parse(writes[0][1]!.body as string);
  expect(body.confirmed).toBe(true);
  expect(body.confirmation).toBe(proposal.confirmation);
});
it("Live provider failure preserves browser voice and editable text", async () => {
  const original = vi.mocked(fetch).getMockImplementation()!;
  vi.mocked(fetch).mockImplementation(async (path, options) => {
    const result = await original(path, options);
    if (path === "/api/me") {
      const data = await result.json();
      return {
        ok: true,
        json: async () => ({ ...data, live_enabled: true }),
      } as Response;
    }
    return result;
  });
  await render();
  await act(async () => button("Start Gemini Live voice").click());
  expect(container.textContent).toContain("Live is unavailable");
  expect(container.querySelector<HTMLTextAreaElement>("#chat")?.disabled).toBe(
    false,
  );
  expect(button("Talk to MetroSathi")).toBeDefined();
});
it("displays the localized provider timeout on HTTP 504 and offers an explicit retry", async () => {
  const original = vi.mocked(fetch).getMockImplementation()!;
  let attempts = 0;
  vi.mocked(fetch).mockImplementation(async (path, options) => {
    if (path === "/api/agent") {
      attempts++;
      return {
        ok: false, status: 504,
        json: async () => ({reply: "The AI request timed out. Please retry.", steps: [], error_code: "AI_TIMEOUT", correlation_id: "test-timeout-reference"}),
      } as Response;
    }
    return original(path, options);
  });
  await render();
  await act(async () => button("My recharge is pending").click());
  expect(container.textContent).toContain("The AI request timed out. Please retry.");
  expect(container.textContent).toContain("Request reference: test-timeout-reference");
  expect(container.querySelector<HTMLTextAreaElement>("#chat")?.disabled).toBe(false);
  await act(async () => button("Retry").click());
  expect(attempts).toBe(2);
});
