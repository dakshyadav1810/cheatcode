import Link from "next/link";
import { Nav } from "@/components/nav";
import { sql } from "@/lib/db";
import { KINDS } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  topic: string;
  cards: number;
  unrevised: number;
  attempts: number;
  failed: number;
  hint: number;
  days_since: number | null;
};


export default async function Analytics({ searchParams }: PageProps<"/analytics">) {
  const q = (await searchParams).kind;
  const kind = (KINDS as readonly string[]).includes(q as string) ? (q as string) : "dsa";

  const rows = (await sql`
    with t as (select id, unnest(tags) as topic, revised from cards where kind = ${kind})
    select t.topic,
           count(distinct t.id)::int                                   as cards,
           count(distinct t.id) filter (where not t.revised)::int      as unrevised,
           count(a.id)::int                                            as attempts,
           count(a.id) filter (where a.outcome = 'failed')::int        as failed,
           count(a.id) filter (where a.outcome = 'hint')::int          as hint,
           extract(day from now() - max(a.at))::int                    as days_since
    from t left join attempts a on a.card_id = t.id
    group by t.topic`) as Row[];

  // Needs-drilling score: 60% struggle rate (fail=1, hint=0.5) + 40% share of cards still unrevised.
  const scored = rows
    .map((r) => {
      const struggle = r.attempts ? (r.failed + 0.5 * r.hint) / r.attempts : 0;
      return { ...r, struggle, score: 0.6 * struggle + 0.4 * (r.unrevised / r.cards) };
    })
    .sort((a, b) => b.score - a.score);

  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
  const ago = (d: number | null) => (d === null ? "never" : d === 0 ? "today" : `${d}d ago`);

  return (
    <>
      <Nav active="analytics" />
      <main className="mx-auto w-full max-w-4xl p-4 md:p-8">
        <div className="mb-5 flex items-center gap-3 text-sm">
          {KINDS.map((k) => (
            <Link key={k} href={`/analytics?kind=${k}`} className={k === kind ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>
              {k.toUpperCase()}
            </Link>
          ))}
        </div>
        {scored.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cards for this deck yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-normal">Topic (worst first, click to see problems)</th>
                  <th className="py-2 pr-4 font-normal">Need drilling</th>
                  <th className="py-2 pr-4 text-right font-normal">Cards</th>
                  <th className="py-2 pr-4 text-right font-normal">Unrevised</th>
                  <th className="py-2 pr-4 text-right font-normal">Attempts</th>
                  <th className="py-2 pr-4 text-right font-normal">Failed</th>
                  <th className="py-2 pr-4 text-right font-normal">Hint</th>
                  <th className="py-2 text-right font-normal">Last</th>
                </tr>
              </thead>
              <tbody>
                {scored.map((r) => (
                  <tr key={r.topic} className="border-b border-border/50">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/?${new URLSearchParams({ ...(kind !== "dsa" && { kind }), topic: r.topic })}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {r.topic}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="h-1.5 w-24 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.round(r.score * 100)}%` }} />
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{r.cards}</td>
                    <td className="py-2 pr-4 text-right font-mono">{r.unrevised}</td>
                    <td className="py-2 pr-4 text-right font-mono">{r.attempts}</td>
                    <td className="py-2 pr-4 text-right font-mono">{pct(r.failed, r.attempts)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{pct(r.hint, r.attempts)}</td>
                    <td className="py-2 text-right font-mono text-muted-foreground">{ago(r.days_since)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Score = 60% struggle rate (failed counts 1, hint 0.5) + 40% share of cards not yet revised. A card with several tags counts toward each topic.
        </p>
      </main>
    </>
  );
}
