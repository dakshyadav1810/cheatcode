# CheatCode

A personal drill app for interview prep. It started as a DSA tracker (a color-coded spreadsheet) and turns it into a closed loop: see the problem, attempt it, reveal your own notes plus a Python reference solution, log how it went.

DSA is the first deck. The data model is generic, so OS and OOP flashcard decks slot in without schema changes.

## Features

- **Add / edit / delete:** `+ Add` on the list opens a form for a new DSA problem (statement, topics, your notes, Python code) or an OS/OOP flashcard. `edit` on any card changes it or deletes it (attempt history goes with it).
- **Problem list (home):** every problem in one table, with category, revised flag, difficulty, topics, attempts and last-drilled. Filter by category, difficulty, topic, unrevised-only or title. Sort by any column. Tick "revised" inline.
- **Drill:** shows only the statement and tags. Reveal (`Space`) shows your notes and the Python reference. Log the attempt as Solved / Needed hint / Failed (`1` / `2` / `3`), and re-tag the category on the spot. `→` or `n` skips.
- **Analytics:** per-topic attempts, fail and hint rate, unrevised share and days since last drilled, ranked by how much each topic needs drilling. Topic names link to the filtered list.
- **Passphrase gate:** one shared passphrase, remembered in an httpOnly cookie.
- Dark, minimal UI. Desktop first, usable on a phone.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · Neon Postgres via `@neondatabase/serverless` · deployed on Vercel.

Note: Next 16 renamed `middleware.ts` to `proxy.ts`. The passphrase gate lives in [src/proxy.ts](src/proxy.ts).

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the two values
npm run dev
```

Point `DATABASE_URL` at your existing Neon database. Only when starting a brand-new database do you need `node scripts/seed.mjs`, which creates the tables and loads the cards from the local `data/` folder.

| Variable         | What it is                                       |
| ---------------- | ------------------------------------------------ |
| `DATABASE_URL`   | Neon connection string (the pooled one)          |
| `APP_PASSPHRASE` | The passphrase the login page asks for           |

`seed.mjs` is insert-only: cards that already exist are never overwritten, so edits you make in the app survive. The database is the source of truth after seeding. Don't re-run it after deleting seeded cards, or they come back.

## Data model

Defined in [db/schema.sql](db/schema.sql).

- `cards`: `kind` (`dsa` | `os` | `oop`), a stable `key`, `title`, `prompt`, optional `answer`, `tags[]`, `difficulty`, `category`, `revised`, and a `meta` jsonb.
  - DSA cards keep their extras in `meta`: `link`, `leetcode_id`, `core_question`, `solution_idea`, `learnings`, `code`.
  - Flashcards only use `prompt` and `answer`.
- `attempts`: one row per drill (`solved` | `hint` | `failed`) with a timestamp. Analytics are computed from this.

### Adding flashcards

Use `+ Add` in the app, or insert rows into `cards` directly (handy when asking Claude to generate a batch). Nothing else needs to change; the deck tabs appear as soon as a second `kind` exists.

```sql
insert into cards (kind, key, title, prompt, answer, tags)
values ('os', 'os:paging-vs-segmentation', 'Paging vs segmentation',
        'What is the difference between paging and segmentation?',
        'Paging: fixed-size blocks, no external fragmentation. Segmentation: variable-size logical units, external fragmentation.',
        '{Memory Management}');
```

## Decks

A deck is a card's `kind`. Current decks: `dsa`, `os`, `oop`, `sql50`. To add a new one, add a line in [src/lib/types.ts](src/lib/types.ts) (name, label, whether it is a problem deck or a flashcard deck, code language) and mirror the name in `scripts/cards.mjs`. The database needs no change. Its tab appears on the problem list as soon as the deck has a card.

## Bulk add cards

Write a JSON array of cards to a file (anywhere; `data/import/` is a good spot since `data/` is gitignored), then:

```bash
npm run cards:import -- data/import/os-memory.json --dry   # validate only, writes nothing
npm run cards:import -- data/import/os-memory.json        # insert into Neon + save a local copy
npm run cards:export                                       # full snapshot of cards + attempts
```

The import checks every card first and inserts nothing if any is invalid. Cards whose deck and title already exist are skipped, so re-running a file is safe. After inserting, the input file and a full snapshot are saved in `data/backups/` (gitignored, local only).

```json
[
  { "kind": "os", "title": "Paging vs segmentation",
    "prompt": "What is the difference between paging and segmentation?",
    "answer": "Paging: fixed-size blocks, no external fragmentation. Segmentation: variable-size logical units.",
    "tags": ["Memory Management"] },

  { "kind": "dsa", "title": "Two Sum", "difficulty": "Easy",
    "prompt": "Given nums and target, return the indices of the two numbers that add up to target.",
    "tags": ["Array", "Hash Table"], "category": "unclassified",
    "link": "https://leetcode.com/problems/two-sum/",
    "core_question": "", "solution_idea": "", "learnings": "",
    "code": "class Solution:\n    def twoSum(self, nums, target):\n        ..." }
]
```

| Field | Notes |
| ----- | ----- |
| `kind` | `dsa` (default), `os`, `oop` or `sql50` |
| `title`, `prompt` | Required. `prompt` is the statement (DSA) or the question (flashcard) |
| `answer` | Required for `os` / `oop`; ignored for problem decks (`dsa`, `sql50`) |
| `tags` | Array, or a comma-separated string |
| `difficulty` | `Easy` / `Medium` / `Hard`, DSA only |
| `category` | `green` / `yellow` / `red` / `gold` / `unclassified` (default) |
| `revised` | `true` / `false` (default) |
| `link`, `core_question`, `solution_idea`, `learnings`, `code`, `leetcode_id` | Problem decks only (`dsa`, `sql50`), all optional. `code` is Python for `dsa`, SQL for `sql50` |
| `source` | Set to `"leetcode"` if `prompt` is HTML copied from LeetCode; otherwise it's shown as plain text |

With Claude Code, just ask, e.g. "write 30 OS flashcards on virtual memory to `data/import/vm.json`, dry-run it, then import". It reads `DATABASE_URL` from your `.env`.

## Where the data lives

The database (Neon) is the source of truth. The repo contains code only: your notes, the copied problem statements and the reference solutions are **not** committed. The `data/` folder is gitignored and exists only on the machine that built the database.

| Path (local only, gitignored) | Purpose |
| ----------------------------- | ------- |
| `data/dsa_dataset.json` | Original rows: your notes, category, revised flag, links |
| `data/solutions/*.txt` | Python reference solutions, one `### <row>` block per problem |
| `data/leetcode_cache.json` | LeetCode difficulty, tags and statements fetched by `enrich.mjs` |
| `data/seed.json` | Generated seed (dataset + LeetCode data + solutions) |

| Script | Purpose |
| ------ | ------- |
| `scripts/enrich.mjs` | Fetches difficulty, tags and statements from LeetCode's GraphQL API into the cache |
| `scripts/build-seed.mjs` | Merges everything into `seed.json` and syntax-checks every solution with Python |
| `scripts/seed.mjs` | Applies the schema and inserts `seed.json` into Postgres (first-time load only) |

These scripts need the local `data/` folder, so they won't work from a fresh clone. That's intended: a fresh clone connects to the existing database through `DATABASE_URL` and needs no seeding. Back up your notes with Neon's own tools, or dump the `cards` table.

## Deploying to Vercel

1. Push the repo to GitHub (it contains code only, no personal notes).
2. Import it in Vercel. Framework preset: Next.js.
3. Add `DATABASE_URL` and `APP_PASSPHRASE` as environment variables. The data is already in Neon, so nothing else is needed.

## Layout

```
src/app/            pages: / (list), /drill, /analytics, /new, /edit/[id], /login
src/components/     problems table, drill UI, shadcn primitives
src/lib/            db client, server actions, filter parsing, types
src/proxy.ts        passphrase gate
db/schema.sql       tables
scripts/            data pipeline
```
