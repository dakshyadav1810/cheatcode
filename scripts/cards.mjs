// Bulk add cards to Neon, and keep a local copy.
//   node scripts/cards.mjs import <file.json> [--dry]   validate, insert into Neon, back up locally
//   node scripts/cards.mjs export                        snapshot every card + attempt to data/backups/
// Needs DATABASE_URL in .env or .env.local. Backups go to data/backups/ (gitignored).
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);
const sql = neon(process.env.DATABASE_URL);

// keep in sync with src/lib/types.ts
const KINDS = ["dsa", "os", "oop", "sql50"];
const PROBLEM_KINDS = ["dsa", "sql50"]; // statement + notes + code; the rest are flashcards
const CATEGORIES = ["green", "yellow", "red", "gold", "unclassified"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const META_FIELDS = ["link", "core_question", "solution_idea", "learnings", "code"];
const BACKUP_DIR = "data/backups";
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));

// Same rules as the add form in the app (src/lib/actions.ts).
function normalize(raw, i) {
  const errs = [];
  const kind = str(raw.kind || "dsa").toLowerCase();
  const title = str(raw.title).trim();
  const prompt = str(raw.prompt).trim();
  const answer = str(raw.answer).trim();
  const category = str(raw.category || "unclassified");
  const isDsa = PROBLEM_KINDS.includes(kind);
  if (!KINDS.includes(kind)) errs.push(`kind must be one of ${KINDS.join("/")}`);
  if (!title) errs.push("title is required");
  if (!CATEGORIES.includes(category)) errs.push(`category must be one of ${CATEGORIES.join("/")}`);
  if (!prompt) errs.push(isDsa ? "prompt (statement) is required" : "prompt (question) is required");
  if (!isDsa && !answer) errs.push("answer is required for flashcard decks (os/oop)");
  if (raw.difficulty && !DIFFICULTIES.includes(raw.difficulty)) errs.push(`difficulty must be ${DIFFICULTIES.join("/")}`);
  const tagList = Array.isArray(raw.tags) ? raw.tags : str(raw.tags).split(",");
  const tags = [...new Set(tagList.map((t) => str(t).trim()).filter(Boolean))].slice(0, 20);
  const meta = { source: raw.source === "leetcode" ? "leetcode" : "custom" }; // "leetcode" = prompt is HTML
  if (isDsa && raw.leetcode_id) meta.leetcode_id = Number(raw.leetcode_id);
  if (isDsa) for (const f of META_FIELDS) if (str(raw[f]).trim()) meta[f] = str(raw[f]).trimEnd();
  return {
    errs: errs.map((e) => `#${i + 1} "${title || "?"}": ${e}`),
    card: {
      kind, title, prompt, tags, category, meta,
      answer: isDsa ? null : answer,
      difficulty: isDsa && raw.difficulty ? raw.difficulty : null,
      revised: raw.revised === true,
    },
  };
}

async function exportAll() {
  const cards = await sql.query("select * from cards order by id");
  const attempts = await sql.query("select * from attempts order by id");
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `cards-${stamp()}.json`);
  fs.writeFileSync(file, JSON.stringify({ exported_at: new Date().toISOString(), cards, attempts }, null, 1));
  console.log(`snapshot: ${cards.length} cards, ${attempts.length} attempts -> ${file}`);
}

async function importFile(file, dry) {
  if (!file) throw new Error("usage: node scripts/cards.mjs import <file.json> [--dry]");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(raw)) throw new Error("file must contain a JSON array of cards");

  const parsed = raw.map(normalize);
  const errors = parsed.flatMap((p) => p.errs);
  if (errors.length) {
    console.error(`${errors.length} problem(s), nothing imported:\n  ` + errors.join("\n  "));
    process.exit(1);
  }

  // Skip anything already in the db (same deck + title) and duplicates inside the file, so re-runs are safe.
  const existing = new Set((await sql.query("select kind, lower(title) as t from cards")).map((r) => `${r.kind}|${r.t}`));
  const toAdd = [], skipped = [];
  for (const { card } of parsed) {
    const id = `${card.kind}|${card.title.toLowerCase()}`;
    if (existing.has(id)) skipped.push(card.title);
    else { existing.add(id); toAdd.push(card); }
  }
  console.log(`${raw.length} in file: ${toAdd.length} new, ${skipped.length} already exist${skipped.length ? " (" + skipped.join(", ") + ")" : ""}`);
  if (dry) return console.log("dry run: nothing written");
  if (!toAdd.length) return;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const copy = path.join(BACKUP_DIR, `import-${stamp()}-${path.basename(file)}`);
  fs.copyFileSync(file, copy); // keep the input first, in case the insert fails part-way
  let n = 0;
  for (const c of toAdd) {
    await sql.query(
      `insert into cards (kind, key, title, prompt, answer, tags, difficulty, category, revised, meta)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [c.kind, `${c.kind}:${crypto.randomUUID().slice(0, 8)}`, c.title, c.prompt, c.answer, c.tags, c.difficulty, c.category, c.revised, JSON.stringify(c.meta)],
    );
    n++;
  }
  console.log(`inserted ${n} card(s); input saved to ${copy}`);
  await exportAll();
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === "import") await importFile(args.find((a) => !a.startsWith("--")), args.includes("--dry"));
  else if (cmd === "export") await exportAll();
  else console.log("usage:\n  node scripts/cards.mjs import <file.json> [--dry]\n  node scripts/cards.mjs export");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
