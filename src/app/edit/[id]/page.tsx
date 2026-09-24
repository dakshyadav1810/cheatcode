import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { CardForm } from "@/components/card-form";
import { sql } from "@/lib/db";
import { knownTags } from "@/lib/queries";
import type { Card } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditCard({ params }: PageProps<"/edit/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [card] = (await sql`
    select id, kind, title, prompt, answer, tags, difficulty, category, revised, meta
    from cards where id = ${id}`) as Card[];
  if (!card) notFound();
  return (
    <>
      <Nav active="problems" />
      <CardForm card={card} initialKind={card.kind} knownTags={await knownTags()} />
    </>
  );
}
