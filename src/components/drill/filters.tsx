"use client";
import { CATEGORIES, type Category, type Kind } from "@/lib/types";
import type { Filters } from "@/lib/filters";
import { CategoryDot } from "@/components/category-dot";
import { cn } from "@/lib/utils";

const selectCls =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring";

export function FilterPanel({
  filters,
  onChange,
  kinds,
  tags,
  count,
  onShuffle,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  kinds: Kind[];
  tags: string[];
  count: number;
  onShuffle: () => void;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const toggleCat = (c: Category) =>
    set({ cats: filters.cats.includes(c) ? filters.cats.filter((x) => x !== c) : [...filters.cats, c] });
  return (
    <div className="flex flex-col gap-4 text-sm">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Deck</span>
        <select className={selectCls} value={filters.kind} onChange={(e) => set({ kind: e.target.value as Kind, tag: "" })}>
          {kinds.map((k) => (
            <option key={k} value={k}>{k.toUpperCase()}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Topic</span>
        <select className={selectCls} value={filters.tag} onChange={(e) => set({ tag: e.target.value })}>
          <option value="">All topics</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      {filters.kind === "dsa" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Difficulty</span>
          <select className={selectCls} value={filters.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
            <option value="">Any</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </label>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => toggleCat(c)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs",
                filters.cats.includes(c) ? "border-foreground/40 bg-accent" : "border-input text-muted-foreground",
              )}
            >
              <CategoryDot category={c} />
              {c}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={filters.unrevisedOnly} onChange={(e) => set({ unrevisedOnly: e.target.checked })} />
        Unrevised only
      </label>
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-muted-foreground">{count} in queue</span>
        <button onClick={onShuffle} className="text-xs text-muted-foreground underline hover:text-foreground">
          reshuffle
        </button>
      </div>
    </div>
  );
}
