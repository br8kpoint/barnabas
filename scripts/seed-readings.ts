// One-off: load data/readings.json into the readings table.
//   pnpm seed:readings    (or)   npm run seed:readings
//
// Requires SUPABASE_SERVICE_ROLE_KEY in env (uses admin client to bypass RLS).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type Row = { day: number; passage: string };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const path = resolve(process.cwd(), "data/readings.json");
  const rows = JSON.parse(readFileSync(path, "utf8")) as Row[];
  console.log(`Loaded ${rows.length} readings from ${path}`);

  const payload = rows.map((r) => ({
    day: r.day,
    passage: r.passage,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("readings").upsert(payload, { onConflict: "day" });
  if (error) throw error;
  console.log(`Upserted ${payload.length} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
