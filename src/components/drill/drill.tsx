"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CategoryDot } from "@/components/category-dot";
import Link from "next/link";
import { FilterPanel } from "./filters";
import { filtersToQuery, type Filters } from "@/lib/filters";
import { recordAttempt, updateCard } from "@/lib/actions";
import { CATEGORIES, type Card, type Category, type Kind, type Outcome } from "@/lib/types";

function shuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  let s = seed;
  const rnd = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(cards: Card[], f: Filters, seed: number, startId?: number) {
  const ids = cards
    .filter(
      (c) =>
        c.kind === f.kind &&
        (!f.tag || c.tags.includes(f.tag)) &&
        (!f.q || c.title.toLowerCase().includes(f.q.toLowerCase())) &&
        (!f.difficulty || c.difficulty === f.difficulty) &&
        f.cats.includes(c.category) &&
        (!f.unrevisedOnly || !c.revised),
    )
    .map((c) => c.id);
  const queue = shuffle(ids, seed || 1);
  if (startId === undefined) return queue;
  return [startId, ...queue.filter((id) => id !== startId)]; // clicked card first, then the rest
}

const OUTCOMES: { key: Outcome; label: string; hotkey: string }[] = [
  { key: "solved", label: "Solved", hotkey: "1" },
  { key: "hint", label: "Needed hint", hotkey: "2" },
  { key: "failed", label: "Failed", hotkey: "3" },
];

export function Drill({
  cards: initial,
  seed: initialSeed,
  initialFilters,
  startId,
}: {
  cards: Card[];
  seed: number;
  initialFilters: Filters;
  startId?: number;
}) {
  const [cards, setCards] = useState(initial);
  const kinds = useMemo(() => [...new Set(initial.map((c) => c.kind))] as Kind[], [initial]);
  const [filters, setFilters] = useState<Filters>({
    ...initialFilters,
    kind: kinds.includes(initialFilters.kind) ? initialFilters.kind : kinds[0] ?? "dsa",
  });
  const [seed, setSeed] = useState(initialSeed);
  const [queue, setQueue] = useState(() =>
    buildQueue(initial, filters, initialSeed, initial.some((c) => c.id === startId) ? startId : undefined),
  );
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [error, setError] = useState("");

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const tags = useMemo(
    () => [...new Set(cards.filter((c) => c.kind === filters.kind).flatMap((c) => c.tags))].sort(),
    [cards, filters.kind],
  );
  const card = byId.get(queue[idx]);

  const rebuild = (f: Filters, s: number) => {
    setFilters(f);
    setSeed(s);
    setQueue(buildQueue(cards, f, s));
    setIdx(0);
    setRevealed(false);
  };

  const next = useCallback(() => {
    setIdx((i) => i + 1);
    setRevealed(false);
  }, []);

  const patch = async (id: number, p: { category?: Category; revised?: boolean }) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
    try {
      await updateCard(id, p);
    } catch {
      setError("Failed to save change");
    }
  };

  const answer = useCallback(
    async (outcome: Outcome) => {
      if (!card) return;
      setError("");
      next();
      try {
        await recordAttempt(card.id, outcome);
      } catch {
        setError("Failed to log attempt");
      }
    },
    [card, next],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      if (!card) return;
      if (e.key === " ") {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (e.key === "ArrowRight" || e.key === "n") next();
      else if (revealed && ["1", "2", "3"].includes(e.key)) answer(OUTCOMES[Number(e.key) - 1].key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, next, answer]);

  const panel = (
    <FilterPanel
      filters={filters}
      onChange={(f) => rebuild(f, seed)}
      kinds={kinds}
      tags={tags}
      count={queue.length}
      onShuffle={() => rebuild(filters, seed + 7919)}
    />
  );

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r p-4 md:block">{panel}</aside>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="p-4">
          <SheetHeader className="p-0 pb-3">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 md:p-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <Link href={`/?${filtersToQuery(filters)}`} className="hover:text-foreground">
                ← Problems
              </Link>
              <Button variant="outline" size="sm" className="md:hidden" onClick={() => setDrawer(true)}>
                Filters
              </Button>
            </div>
            <span className="ml-auto font-mono">{card ? `${idx + 1} / ${queue.length}` : `${queue.length} cards`}</span>
          </div>

          {!card ? (
            <div className="flex flex-col items-start gap-3 py-16">
              <p className="text-muted-foreground">
                {queue.length === 0 ? "No cards match these filters." : "Queue finished."}
              </p>
              {queue.length > 0 && <Button onClick={() => rebuild(filters, seed + 7919)}>Reshuffle</Button>}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryDot category={card.category} />
                  <h1 className="text-lg font-semibold">{card.title}</h1>
                  <Link href={`/edit/${card.id}`} className="text-xs text-muted-foreground underline">
                    edit
                  </Link>
                  {card.meta.link && (
                    <a href={card.meta.link} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">
                      open ↗
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {card.difficulty && <Badge variant="outline">{card.difficulty}</Badge>}
                  {card.tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                  {card.meta.oa_label && <Badge variant="outline">{card.meta.oa_label}</Badge>}
                </div>
              </div>

              {card.prompt ? (
                card.kind === "dsa" && card.meta.source === "leetcode" ? (
                  <div className="statement" dangerouslySetInnerHTML={{ __html: card.prompt }} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{card.prompt}</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  No statement stored{card.meta.link ? " — open the link above." : "."}
                </p>
              )}

              {!revealed ? (
                <Button className="w-fit" onClick={() => setRevealed(true)}>
                  Reveal <kbd className="ml-1 font-mono text-xs opacity-60">space</kbd>
                </Button>
              ) : (
                <div className="flex flex-col gap-5 border-t pt-5">
                  {card.answer && <Section title="Answer" text={card.answer} />}
                  {card.meta.core_question && <Section title="Core question" text={card.meta.core_question} />}
                  {card.meta.solution_idea && <Section title="Solution idea" text={card.meta.solution_idea} />}
                  {card.meta.learnings && <Section title="Learnings" text={card.meta.learnings} />}
                  {card.meta.code && (
                    <div className="flex flex-col gap-1.5">
                      <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Reference (Python)</h2>
                      <pre className="overflow-x-auto rounded-md border bg-card p-3 font-mono text-[0.8125rem] leading-relaxed">
                        {card.meta.code}
                      </pre>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4">
                    <div className="flex flex-wrap gap-2">
                      {OUTCOMES.map((o) => (
                        <Button key={o.key} variant="outline" onClick={() => answer(o.key)}>
                          {o.label} <kbd className="ml-1 font-mono text-xs opacity-60">{o.hotkey}</kbd>
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <select
                        value={card.category}
                        onChange={(e) => patch(card.id, { category: e.target.value as Category })}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={card.revised}
                          onChange={(e) => patch(card.id, { revised: e.target.checked })}
                        />
                        revised
                      </label>
                    </div>
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground">{title}</h2>
      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}
