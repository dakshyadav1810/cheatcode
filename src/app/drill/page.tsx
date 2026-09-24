import { Nav } from "@/components/nav";
import { Drill } from "@/components/drill/drill";
import { sql } from "@/lib/db";
import { parseFilters } from "@/lib/filters";
import type { Card } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DrillPage({ searchParams }: PageProps<"/drill">) {
  const sp = await searchParams;
  const cards = (await sql`
    select id, kind, title, prompt, answer, tags, difficulty, category, revised, meta
    from cards order by id`) as Card[];
  const [{ seed }] = await sql`select (floor(random() * 2147483645) + 1)::int as seed`;
  const start = Number(Array.isArray(sp.card) ? sp.card[0] : sp.card);
  return (
    <>
      <Nav active="drill" />
      <Drill
        cards={cards}
        seed={seed as number}
        initialFilters={parseFilters(sp)}
        startId={Number.isInteger(start) ? start : undefined}
      />
    </>
  );
}
