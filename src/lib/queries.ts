import { sql } from "./db";

// Most-used topics first, for the tag suggestions in the add/edit form.
export async function knownTags(limit = 30): Promise<string[]> {
  const rows = await sql`
    select t from (select unnest(tags) as t from cards) x
    group by t order by count(*) desc, t limit ${limit}`;
  return rows.map((r) => r.t as string);
}
