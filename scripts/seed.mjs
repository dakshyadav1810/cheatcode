// Applies db/schema.sql and loads data/seed.json. INSERT-ONLY: cards that already exist are left
// untouched, so edits you make in the app are never overwritten. (A seeded card you deleted in the
// app would be re-added if you re-run this, so treat it as a first-time load.)
// Run: node scripts/seed.mjs   (needs DATABASE_URL in .env.local)
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);
const sql = neon(process.env.DATABASE_URL);

for (const stmt of fs.readFileSync("db/schema.sql", "utf8").split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
  await sql.query(stmt);
}

const cards = JSON.parse(fs.readFileSync("data/seed.json", "utf8"));
for (const c of cards) {
  await sql.query(
    `insert into cards (kind, key, title, prompt, answer, tags, difficulty, category, revised, meta)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (key) do nothing`,
    [c.kind, c.key, c.title, c.prompt, c.answer ?? null, c.tags, c.difficulty, c.category, c.revised, JSON.stringify(c.meta)],
  );
}
const [{ n }] = await sql.query("select count(*)::int as n from cards");
console.log(`seeded; cards in db: ${n}`);
