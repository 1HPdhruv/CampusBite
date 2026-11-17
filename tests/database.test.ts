import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
it("migration, repeatable seed, constraints, private RLS and atomic idempotent ticket RPC", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role;",
    );
    await db.exec(
      readFileSync("supabase/migrations/202611110001_metrosathi.sql", "utf8"),
    );
    const seed = readFileSync("seed/metrosathi.sql", "utf8");
    await db.exec(seed);
    await db.exec(seed);
    expect(
      (await db.query("select * from metro_passengers")).rows,
    ).toHaveLength(3);
    expect(
      (await db.query("select * from metro_smart_cards")).rows,
    ).toHaveLength(4);
    expect((await db.query("select * from metro_fares")).rows).toHaveLength(8);
    await db.exec(readFileSync("seed/20261111_station_reference.sql", "utf8"));
    expect((await db.query("select * from metro_stations")).rows).toHaveLength(
      7,
    );
    const A = "10000000-0000-4000-8000-000000000001",
      card = "20000000-0000-4000-8000-000000000001";
    const args = [
      A,
      card,
      "recharge",
      "Demo card update is pending",
      "ta-IN",
      crypto.randomUUID(),
      "a".repeat(64),
    ];
    const query =
      "select * from metro_create_ticket($1::uuid,$2::uuid,$3,$4,$5,$6::uuid,$7)";
    await db.exec("set role service_role");
    const a = await db.query<{ id: string }>(query, args);
    const b = await db.query<{ id: string }>(query, args);
    expect(a.rows[0].id).toBe(b.rows[0].id);
    const replay = await db.query<{ id: string }>(query, [
      ...args.slice(0, 5),
      crypto.randomUUID(),
      args[6],
    ]);
    expect(replay.rows[0].id).toBe(a.rows[0].id);
    await expect(
      db.query(query, [
        A,
        "20000000-0000-4000-8000-000000000002",
        ...args.slice(2),
      ]),
    ).rejects.toThrow("CARD_NOT_FOUND");
    await expect(
      db.query(query, [...args.slice(0, 6), "b".repeat(64)]),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    expect(
      (await db.query("select * from metro_audit_events")).rows,
    ).toHaveLength(1);
    await expect(
      db.query("update metro_smart_cards set balance=-1 where id=$1", [card]),
    ).rejects.toThrow();
    await db.exec("reset role; set role anon");
    await expect(db.query("select * from metro_smart_cards")).rejects.toThrow();
    await expect(db.query(query, args)).rejects.toThrow();
    await db.exec("reset role; set role authenticated");
    await expect(
      db.query("select * from metro_support_tickets"),
    ).rejects.toThrow();
  } finally {
    await db.close();
  }
}, 30000);
