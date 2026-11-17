# MetroSathi judge demo (3–5 minutes)

Preparation: `DEMO_MODE=true METRO_STORAGE=memory npm run dev` (or approved/seeded Supabase mode), valid local team passcode and working Gemini quota. Choose a supported speech browser with Tamil voice installed, if available. Keep text fallback ready. Explain that this is an independent prototype, not a CMRL integration. Do not imply money moved.

**0:00–0:40 — Identity and trust**
Sign in and select **Kavya · Demo**. Point to persistent “Demo data / மாதிரி தரவு” labels, synthetic ₹286 balance and masked card. Mention public demo fixtures and no access to live AFC/issuer records.

**0:40–1:50 — Bilingual pending recharge**
Select தமிழ். Click Talk; say “என் மாதிரி ரீசார்ஜில் பணம் செலுத்தியது வெற்றி, ஆனால் அட்டை புதுப்பிப்பு நிலுவையில் உள்ளது. சரிபார்க்கவும்.” Stop if needed, edit the caption, then send. Alternatively type the same text. The tool must read `SIM-RECHARGE-1`: simulated ₹200, payment success, card update pending. Ask in English with Auto to show response switching; ask to explain the difference. The UI's My smart card page displays the same separated statuses without relying on Gemini availability.

**1:50–2:50 — Safe support workflow**
Ask for an in-app support ticket. The agent should propose a visible review summary; if provider is unavailable, use Support centre and enter a synthetic description of the pending card update. Show that no ticket exists yet. Review category, masked card and text. Press **Confirm & create prototype ticket**. Show its MS-DEMO number and list entry. State explicitly: this is stored only in the prototype; CMRL has not received a complaint. In memory mode it can disappear on restart; use approved Supabase for durable demonstration.

**2:50–3:30 — Grounded fare/station enquiry**
Open Stations & fares. Select Airport → Meenambakkam: published standard ₹10, separately published 20% discounted ₹8; checked 11 November 2026, effective date unknown. Show official table link. Switch destination to Egmore: the app says fare not verified and links to CMRL. This deliberate refusal demonstrates grounding rather than guessed fares. Search “கிண்டி” to find checked Guindy record. No full-network route claim.

**3:30–4:15 — Boundaries**
Ask about a lost card. Show the official dated policy: no lost balance transfer/refund and inability to block lost NCMC offline-wallet funds. No block/refund button. Switch to Arun: different synthetic card/recharge; Kavya's ticket is absent. End on official help links and the visible non-affiliation disclosure.

If speech permission is denied, show the friendly error and continue typing. If Gemini is unavailable, demonstrate the fully independent data/ticket/fare panels, acknowledge that generated conversation is unavailable, and do not claim a successful AI interaction.

Optional Live variation: set `GEMINI_LIVE_ENABLED=true` locally, click Start Gemini Live voice and allow the microphone. Ask the same synthetic balance/recharge question in Tamil/English; captions and authorized read tools should agree with the panels. Stop before navigating. If Live fails, use browser voice or type; do not claim a successful microphone session from the SDK-only test evidence. Never create tickets by voice without the existing separate review/confirmation.
