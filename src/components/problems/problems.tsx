"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CategoryDot } from "@/components/category-dot";
import { updateCard } from "@/lib/actions";
import { filtersToQuery, type Filters } from "@/lib/filters";
import { CATEGORIES, type Category, type Kind, type ListRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "id" | "title" | "difficulty" | "category" | "attempts" | "last";
const DIFF_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
// review priority: what needs work first
const CAT_ORDER: Record<Category, number> = { red: 0, yellow: 1, unclassified: 2, gold: 3, green: 4 };
const OUTCOME_COLOR = { solved: "var(--cat-green)", hint: "var(--cat-yellow)", failed: "var(--cat-red)" };

const TOPIC_PREVIEW = 14;

const chip = (on: boolean) =>
  cn(
    "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors",
    on ? "border-foreground/50 bg-accent text-foreground" : "border-input text-muted-foreground hover:text-foreground",
  );

export function Problems({ rows: initial, initialFilters }: { rows: ListRow[]; initialFilters: Filters }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filters, setFilters] = useState(initialFilters);
  const [allTopics, setAllTopics] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "id", dir: 1 });

  const kinds = useMemo(() => [...new Set(initial.map((r) => r.kind))] as Kind[], [initial]);
  const deck = useMemo(() => rows.filter((r) => r.kind === filters.kind), [rows, filters.kind]);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    const qs = filtersToQuery(next);
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/"); // keeps filters when coming back from a card
  };

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of deck) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [deck]);

  const catCounts = useMemo(() => {
    const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    for (const r of deck) c[r.category]++;
    return c;
  }, [deck]);

  const shown = useMemo(() => {
    const q = filters.q.toLowerCase();
    const list = deck.filter(
      (r) =>
        (!filters.tag || r.tags.includes(filters.tag)) &&
        (!filters.difficulty || r.difficulty === filters.difficulty) &&
        filters.cats.includes(r.category) &&
        (!filters.unrevisedOnly || !r.revised) &&
        (!q || r.title.toLowerCase().includes(q)),
    );
    const val = (r: ListRow): number | string => {
      switch (sort.key) {
        case "title": return r.title.toLowerCase();
        case "difficulty": return DIFF_ORDER[r.difficulty ?? ""] ?? 3;
        case "category": return CAT_ORDER[r.category];
        case "attempts": return r.attempts;
        case "last": return r.days_since ?? Infinity; // never-drilled sorts as oldest
        default: return r.id;
      }
    };
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : a.id - b.id) * sort.dir;
    });
  }, [deck, filters, sort]);

  const toggleCat = (c: Category) => {
    const all = filters.cats.length === CATEGORIES.length;
    if (all) return update({ cats: [c] }); // from "everything" a click means "only this"
    const cats = filters.cats.includes(c) ? filters.cats.filter((x) => x !== c) : [...filters.cats, c];
    update({ cats: cats.length ? cats : [...CATEGORIES] });
  };

  const setRevised = async (id: number, revised: boolean) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, revised } : r)));
    try {
      await updateCard(id, { revised });
    } catch {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, revised: !revised } : r)));
    }
  };

  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: 1 }));
  const th = (key: SortKey, label: string, cls = "") => (
    <th className={cn("px-3 py-2 text-left font-normal", cls)}>
      <button onClick={() => sortBy(key)} className="hover:text-foreground">
        {label}
        {sort.key === key && <span className="ml-1">{sort.dir === 1 ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  const total = deck.length;
  const revisedCount = deck.filter((r) => r.revised).length;
  const attempts = deck.reduce((n, r) => n + r.attempts, 0);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:px-8 md:py-6">
      {kinds.length > 1 && (
        <div className="mb-4 flex gap-1">
          {kinds.map((k) => (
            <button key={k} onClick={() => update({ kind: k, tag: "" })} className={chip(k === filters.kind)}>
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span><b className="text-lg font-medium text-foreground">{total}</b> problems</span>
        <span><b className="font-medium text-foreground">{revisedCount}</b> revised</span>
        <span><b className="font-medium text-foreground">{total - revisedCount}</b> to revise</span>
        <span><b className="font-medium text-foreground">{attempts}</b> drill attempts</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => toggleCat(c)} className={chip(filters.cats.includes(c) && filters.cats.length < CATEGORIES.length)}>
            <CategoryDot category={c} />
            {c}
            <span className="font-mono text-[0.6875rem] opacity-70">{catCounts[c]}</span>
          </button>
        ))}
        <span className="mx-1 w-px bg-border" />
        {["Easy", "Medium", "Hard"].map((d) => (
          <button key={d} onClick={() => update({ difficulty: filters.difficulty === d ? "" : d })} className={chip(filters.difficulty === d)}>
            {d}
          </button>
        ))}
        <button onClick={() => update({ unrevisedOnly: !filters.unrevisedOnly })} className={chip(filters.unrevisedOnly)}>
          Unrevised only
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button onClick={() => update({ tag: "" })} className={chip(filters.tag === "")}>All topics</button>
        {(allTopics ? topics : topics.filter(([t], i) => i < TOPIC_PREVIEW || t === filters.tag)).map(([t, n]) => (
          <button key={t} onClick={() => update({ tag: filters.tag === t ? "" : t })} className={chip(filters.tag === t)}>
            {t}
            <span className="font-mono text-[0.6875rem] opacity-70">{n}</span>
          </button>
        ))}
        {topics.length > TOPIC_PREVIEW && (
          <button onClick={() => setAllTopics((v) => !v)} className="h-7 px-2 text-xs text-muted-foreground underline hover:text-foreground">
            {allTopics ? "show fewer" : `all ${topics.length} topics`}
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-3">
        <input
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search title…"
          className="h-8 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
        />
        <span className="whitespace-nowrap text-sm text-muted-foreground">{shown.length} shown</span>
        <Link
          href={`/new?kind=${filters.kind}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
        >
          + Add
        </Link>
        <Link
          href={`/drill?${filtersToQuery(filters)}`}
          className={buttonVariants({ size: "sm" })}
          aria-disabled={shown.length === 0}
        >
          Drill these
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-card text-xs text-muted-foreground">
            <tr>
              {th("id", "#", "w-14")}
              {th("title", "Problem")}
              {th("difficulty", "Difficulty")}
              <th className="hidden px-3 py-2 text-left font-normal lg:table-cell">Topics</th>
              {th("category", "Category")}
              <th className="px-3 py-2 text-left font-normal">Revised</th>
              {th("attempts", "Attempts", "hidden md:table-cell")}
              {th("last", "Last drilled", "hidden md:table-cell")}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/drill?${filtersToQuery(filters, { card: String(r.id) })}`)}
                className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-accent/50"
              >
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.lc ?? (r.source === "company_oa" ? "OA" : "—")}</td>
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/drill?${filtersToQuery(filters, { card: String(r.id) })}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.difficulty ?? "—"}</td>
                <td className="hidden px-3 py-2 text-xs text-muted-foreground lg:table-cell">
                  {r.tags.slice(0, 3).join(", ")}
                  {r.tags.length > 3 && ` +${r.tags.length - 3}`}
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <CategoryDot category={r.category} />
                    {r.category}
                  </span>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={r.revised}
                    onChange={(e) => setRevised(r.id, e.target.checked)}
                    aria-label={`Revised: ${r.title}`}
                  />
                </td>
                <td className="hidden px-3 py-2 md:table-cell">
                  {r.attempts ? (
                    <span className="font-mono text-xs">
                      {r.solved}/{r.attempts}
                      {r.last_outcome && (
                        <span className="ml-2 font-sans" style={{ color: OUTCOME_COLOR[r.last_outcome] }}>
                          {r.last_outcome}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
                  {r.days_since === null ? "never" : r.days_since === 0 ? "today" : `${r.days_since}d ago`}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  No problems match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
