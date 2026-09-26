import { CATEGORIES, KINDS, type Category, type Kind } from "./types";

export type Filters = {
  kind: Kind;
  tag: string;
  difficulty: string;
  cats: Category[];
  unrevisedOnly: boolean;
  q: string;
};

export const DEFAULT_FILTERS: Filters = {
  kind: "dsa",
  tag: "",
  difficulty: "",
  cats: [...CATEGORIES],
  unrevisedOnly: false,
  q: "",
};

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: SearchParams): Filters {
  const kind = one(sp.kind) as Kind;
  const cats = one(sp.cat)
    .split(",")
    .filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c));
  return {
    kind: KINDS.includes(kind) ? kind : "dsa",
    tag: one(sp.topic),
    difficulty: ["Easy", "Medium", "Hard"].includes(one(sp.diff)) ? one(sp.diff) : "",
    cats: cats.length ? cats : [...CATEGORIES],
    unrevisedOnly: one(sp.unrevised) === "1",
    q: one(sp.q),
  };
}

// Only non-default values go in the URL, so links stay short.
export function filtersToQuery(f: Filters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (f.kind !== "dsa") p.set("kind", f.kind);
  if (f.tag) p.set("topic", f.tag);
  if (f.difficulty) p.set("diff", f.difficulty);
  if (f.cats.length !== CATEGORIES.length) p.set("cat", f.cats.join(","));
  if (f.unrevisedOnly) p.set("unrevised", "1");
  if (f.q) p.set("q", f.q);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}
