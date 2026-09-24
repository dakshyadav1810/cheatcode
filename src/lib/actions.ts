"use server";
import { sql } from "./db";
import { CATEGORIES, type CardInput, type Category, type Outcome } from "./types";

const OUTCOMES: Outcome[] = ["solved", "hint", "failed"];
const KINDS = ["dsa", "os", "oop"];
// Fields that live in cards.meta; empty values are removed rather than stored.
const META_FIELDS = ["link", "core_question", "solution_idea", "learnings", "code"] as const;

export async function recordAttempt(cardId: number, outcome: Outcome) {
  if (!OUTCOMES.includes(outcome)) throw new Error("bad outcome");
  await sql`insert into attempts (card_id, outcome) values (${cardId}, ${outcome})`;
}

export async function updateCard(cardId: number, patch: { category?: Category; revised?: boolean }) {
  if (patch.category !== undefined) {
    if (!CATEGORIES.includes(patch.category)) throw new Error("bad category");
    await sql`update cards set category = ${patch.category} where id = ${cardId}`;
  }
  if (patch.revised !== undefined) {
    await sql`update cards set revised = ${patch.revised} where id = ${cardId}`;
  }
}

function validate(input: CardInput) {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  if (!KINDS.includes(input.kind)) throw new Error("Bad deck");
  if (!CATEGORIES.includes(input.category)) throw new Error("Bad category");
  const isDsa = input.kind === "dsa";
  if (isDsa && !input.prompt.trim()) throw new Error("Statement is required");
  if (!isDsa && (!input.prompt.trim() || !input.answer.trim())) throw new Error("Question and answer are required");
  const tags = [...new Set(input.tags.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
  const difficulty = isDsa && ["Easy", "Medium", "Hard"].includes(input.difficulty) ? input.difficulty : null;
  const meta = Object.fromEntries(
    META_FIELDS.filter((f) => isDsa && input[f].trim()).map((f) => [f, input[f].trimEnd()]),
  );
  return {
    title,
    prompt: input.prompt.trim(),
    answer: !isDsa ? input.answer.trim() : null,
    tags,
    difficulty,
    meta,
  };
}

export async function createCard(input: CardInput): Promise<number> {
  const v = validate(input);
  const key = `${input.kind}:${crypto.randomUUID().slice(0, 8)}`;
  const meta = JSON.stringify({ source: "custom", ...v.meta });
  const [row] = await sql`
    insert into cards (kind, key, title, prompt, answer, tags, difficulty, category, revised, meta)
    values (${input.kind}, ${key}, ${v.title}, ${v.prompt}, ${v.answer}, ${v.tags}, ${v.difficulty},
            ${input.category}, ${input.revised}, ${meta}::jsonb)
    returning id`;
  return row.id as number;
}

export async function saveCard(id: number, input: CardInput) {
  const v = validate(input);
  // Clear the editable meta keys first, then merge in the non-empty ones; other keys
  // (source, leetcode_id, oa_label) are preserved.
  await sql`
    update cards set title = ${v.title}, prompt = ${v.prompt}, answer = ${v.answer}, tags = ${v.tags},
      difficulty = ${v.difficulty}, category = ${input.category}, revised = ${input.revised},
      meta = (meta - ${[...META_FIELDS]}::text[]) || ${JSON.stringify(v.meta)}::jsonb
    where id = ${id}`;
}

export async function deleteCard(id: number) {
  await sql`delete from cards where id = ${id}`; // attempts cascade
}
