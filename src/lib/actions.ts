"use server";
import { sql } from "./db";
import { CATEGORIES, type Category, type Outcome } from "./types";

const OUTCOMES: Outcome[] = ["solved", "hint", "failed"];

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
