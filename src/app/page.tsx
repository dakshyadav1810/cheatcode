import { Nav } from "@/components/nav";
import { Problems } from "@/components/problems/problems";
import { sql } from "@/lib/db";
import { parseFilters } from "@/lib/filters";
import type { ListRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const rows = (await sql`
    select c.id, c.kind, c.title, c.tags, c.difficulty, c.category, c.revised,
           c.meta->>'leetcode_id'                                as lc,
           count(a.id)::int                                      as attempts,
           count(a.id) filter (where a.outcome = 'solved')::int  as solved,
           (array_agg(a.outcome order by a.at desc))[1]          as last_outcome,
           extract(day from now() - max(a.at))::int              as days_since
    from cards c left join attempts a on a.card_id = c.id
    group by c.id order by c.id`) as ListRow[];
  return (
    <>
      <Nav active="problems" />
      <Problems rows={rows} initialFilters={parseFilters(await searchParams)} />
    </>
  );
}
