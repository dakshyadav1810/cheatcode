"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createCard, deleteCard, saveCard } from "@/lib/actions";
import { CATEGORIES, type Card, type CardInput, type Category, type Kind } from "@/lib/types";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring";

const KIND_LABEL: Record<Kind, string> = { dsa: "DSA problem", os: "OS flashcard", oop: "OOP flashcard" };

function toInput(kind: Kind, card?: Card): CardInput {
  return {
    kind,
    title: card?.title ?? "",
    prompt: card?.prompt ?? "",
    answer: card?.answer ?? "",
    tags: card?.tags ?? [],
    difficulty: card?.difficulty ?? "",
    category: card?.category ?? "unclassified",
    revised: card?.revised ?? false,
    link: card?.meta.link ?? "",
    core_question: card?.meta.core_question ?? "",
    solution_idea: card?.meta.solution_idea ?? "",
    learnings: card?.meta.learnings ?? "",
    code: card?.meta.code ?? "",
  };
}

export function CardForm({
  card,
  initialKind,
  knownTags,
}: {
  card?: Card; // present = editing
  initialKind: Kind;
  knownTags: string[];
}) {
  const router = useRouter();
  const [f, setF] = useState(() => toInput(card?.kind ?? initialKind, card));
  const [tagText, setTagText] = useState(f.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<CardInput>) => setF((p) => ({ ...p, ...patch }));
  const isDsa = f.kind === "dsa";
  const htmlStatement = card?.meta.source === "leetcode"; // fetched statements are stored as HTML

  const tags = tagText.split(",").map((t) => t.trim()).filter(Boolean);
  const toggleTag = (t: string) =>
    setTagText((tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]).join(", "));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input = { ...f, tags };
      if (card) await saveCard(card.id, input);
      else await createCard(input);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!card || !window.confirm(`Delete "${card.title}" and its attempt history? This can't be undone.`)) return;
    setBusy(true);
    try {
      await deleteCard(card.id);
      router.push("/");
      router.refresh();
    } catch {
      setError("Failed to delete");
      setBusy(false);
    }
  };

  const label = (text: string, hint?: string) => (
    <span className="mb-1.5 block text-xs text-muted-foreground">
      {text}
      {hint && <span className="ml-2 opacity-70">{hint}</span>}
    </span>
  );

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:py-8">
      <h1 className="text-lg font-semibold">{card ? "Edit" : "Add"} {KIND_LABEL[f.kind]}</h1>

      {!card && (
        <div className="flex gap-1">
          {(["dsa", "os", "oop"] as Kind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => set({ kind: k })}
              className={cn(
                "h-7 rounded-md border px-2.5 text-xs",
                f.kind === k ? "border-foreground/50 bg-accent" : "border-input text-muted-foreground",
              )}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}

      <label>
        {label("Title")}
        <input className={cn(field, "h-9")} value={f.title} onChange={(e) => set({ title: e.target.value })} required autoFocus />
      </label>

      {isDsa && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            {label("Difficulty")}
            <select className={cn(field, "h-9")} value={f.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
              <option value="">—</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </label>
          <label>
            {label("Category")}
            <select className={cn(field, "h-9")} value={f.category} onChange={(e) => set({ category: e.target.value as Category })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            {label("Link", "optional")}
            <input className={cn(field, "h-9")} value={f.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://…" />
          </label>
        </div>
      )}

      <label>
        {label(isDsa ? "Statement" : "Question", htmlStatement ? "HTML (fetched from LeetCode)" : undefined)}
        <textarea
          className={cn(field, "min-h-32 py-2 leading-relaxed", htmlStatement && "font-mono text-xs")}
          value={f.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          required
        />
      </label>

      {!isDsa && (
        <label>
          {label("Answer")}
          <textarea className={cn(field, "min-h-32 py-2 leading-relaxed")} value={f.answer} onChange={(e) => set({ answer: e.target.value })} required />
        </label>
      )}

      <div>
        {label("Topics", "comma separated")}
        <input className={cn(field, "h-9")} value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Graph Theory, Union-Find" />
        {knownTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {knownTags.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => toggleTag(t)}
                className={cn(
                  "h-6 rounded-md border px-2 text-xs",
                  tags.includes(t) ? "border-foreground/50 bg-accent" : "border-input text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {isDsa && (
        <>
          <label>
            {label("Core question", "your one-line paraphrase; optional")}
            <textarea className={cn(field, "min-h-16 py-2")} value={f.core_question} onChange={(e) => set({ core_question: e.target.value })} />
          </label>
          <label>
            {label("Solution idea", "optional")}
            <textarea className={cn(field, "min-h-20 py-2")} value={f.solution_idea} onChange={(e) => set({ solution_idea: e.target.value })} />
          </label>
          <label>
            {label("Learnings", "optional")}
            <textarea className={cn(field, "min-h-20 py-2")} value={f.learnings} onChange={(e) => set({ learnings: e.target.value })} />
          </label>
          <label>
            {label("Reference code (Python)", "optional")}
            <textarea
              className={cn(field, "min-h-56 py-2 font-mono text-[0.8125rem] leading-relaxed")}
              value={f.code}
              onChange={(e) => set({ code: e.target.value })}
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault(); // insert 4 spaces instead of leaving the field
                  const el = e.currentTarget;
                  const { selectionStart: s, selectionEnd: en } = el;
                  set({ code: f.code.slice(0, s) + "    " + f.code.slice(en) });
                  requestAnimationFrame(() => (el.selectionStart = el.selectionEnd = s + 4));
                }
              }}
            />
          </label>
        </>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.revised} onChange={(e) => set({ revised: e.target.checked })} />
        Already revised
      </label>
      {!isDsa && (
        <p className="-mt-3 text-xs text-muted-foreground">Category is set from the card while drilling (default: unclassified).</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={busy}>{card ? "Save changes" : "Add"}</Button>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
        {card && (
          <Button type="button" variant="outline" disabled={busy} onClick={remove} className="ml-auto text-destructive">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
