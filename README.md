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
node scripts/seed.mjs              # creates the tables and loads all cards
npm run dev
```

| Variable         | What it is                                       |
| ---------------- | ------------------------------------------------ |
| `DATABASE_URL`   | Neon connection string (the pooled one)          |
| `APP_PASSPHRASE` | The passphrase the login page asks for           |

`seed.mjs` is a first-time load and is insert-only: cards that already exist are never overwritten, so edits you make in the app survive. The database is the source of truth after seeding. Don't re-run it after deleting seeded cards, or they come back.

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

## Where the data came from

| Path | Purpose |
| ---- | ------- |
| `data/dsa_dataset.json` | Source rows: your notes, category, revised flag, links |
| `data/solutions/*.txt` | Python reference solutions, one `### <row>` block per problem |
| `data/seed.json` | Generated seed (dataset + LeetCode data + solutions) |
| `scripts/enrich.mjs` | Fetches difficulty, tags and statements from LeetCode's GraphQL API into a local cache (gitignored) |
| `scripts/build-seed.mjs` | Merges everything into `seed.json` and syntax-checks every solution with Python |
| `scripts/seed.mjs` | Applies the schema and upserts `seed.json` into Postgres |

Regenerating from scratch: `node scripts/enrich.mjs && node scripts/build-seed.mjs && node scripts/seed.mjs`.

## Deploying to Vercel

1. Push to a **private** GitHub repo (it contains personal notes and copied problem statements).
2. Import it in Vercel. Framework preset: Next.js.
3. Add `DATABASE_URL` and `APP_PASSPHRASE` as environment variables.
4. Run `node scripts/seed.mjs` once locally against the same database.

## Layout

```
src/app/            pages: / (list), /drill, /analytics, /new, /edit/[id], /login
src/components/     problems table, drill UI, shadcn primitives
src/lib/            db client, server actions, filter parsing, types
src/proxy.ts        passphrase gate
db/schema.sql       tables
scripts/            data pipeline
```
