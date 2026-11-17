// Synthetic public demo accounts. No passenger, card or transaction is real.
export const passengers = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Kavya · Demo",
    language: "ta-IN",
    is_demo: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Arun · Demo",
    language: "en-IN",
    is_demo: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Meena · Demo",
    language: "ta-IN",
    is_demo: true,
  },
];
export const cards = passengers.map((p, i) => ({
  id: `20000000-0000-4000-8000-00000000000${i + 1}`,
  passenger_id: p.id,
  kind: "ncmc",
  masked_number: `•••• •••• ${4201 + i}`,
  status: "active",
  balance: [286, 152, 420][i],
  is_demo: true,
  issuer_note: "Synthetic NCMC fixture; no issuer connection",
  updated_at: "2026-11-11T08:30:00+05:30",
}));
cards.push({
  ...cards[1],
  id: "20000000-0000-4000-8000-000000000004",
  kind: "legacy_cmrl_stored_value",
  masked_number: "•••• •••• 9201",
  status: "policy_example",
  balance: 0,
  issuer_note: "Historical policy example; current availability not asserted",
});
export const transactions = cards
  .filter((c) => c.kind === "ncmc")
  .flatMap((c, i) => [
    {
      id: `30000000-0000-4000-8000-00000000000${i * 2 + 1}`,
      card_id: c.id,
      passenger_id: c.passenger_id,
      type: "travel",
      amount: -32,
      status: "success",
      reference: `SIM-TRAVEL-${i + 1}`,
      description: "Simulated metro journey",
      occurred_at: "2026-11-10T18:40:00+05:30",
      is_demo: true,
    },
    {
      id: `30000000-0000-4000-8000-00000000000${i * 2 + 2}`,
      card_id: c.id,
      passenger_id: c.passenger_id,
      type: "recharge",
      amount: 200,
      status: i === 0 ? "pending" : i === 1 ? "success" : "failed",
      reference: `SIM-RECHARGE-${i + 1}`,
      description: "Simulated recharge attempt",
      occurred_at: "2026-11-11T08:00:00+05:30",
      is_demo: true,
    },
  ]);
export const recharges = cards
  .filter((c) => c.kind === "ncmc")
  .map((c, i) => ({
    id: `40000000-0000-4000-8000-00000000000${i + 1}`,
    card_id: c.id,
    passenger_id: c.passenger_id,
    amount: 200,
    reference: `SIM-RECHARGE-${i + 1}`,
    payment_status: i === 2 ? "failed" : "success",
    card_update_status: i === 0 ? "pending" : i === 1 ? "success" : "unknown",
    created_at: "2026-11-11T08:00:00+05:30",
    is_demo: true,
  }));
export type Card = (typeof cards)[number];
export type Transaction = (typeof transactions)[number];
export type Recharge = (typeof recharges)[number];
export type Passenger = (typeof passengers)[number];
