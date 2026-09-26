export const CATEGORIES = ["green", "yellow", "red", "gold", "unclassified"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Outcome = "solved" | "hint" | "failed";
// Adding a deck = add it here. "Problem" decks have a statement, notes and reference code;
// the others are plain question/answer flashcards.
export const KINDS = ["dsa", "os", "oop", "sql50"] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = {
  dsa: "DSA problem",
  os: "OS flashcard",
  oop: "OOP flashcard",
  sql50: "SQL50 problem",
};
export const isProblem = (k: Kind) => k === "dsa" || k === "sql50";
export const CODE_LANG: Partial<Record<Kind, string>> = { dsa: "Python", sql50: "SQL" };

export type Card = {
  id: number;
  kind: Kind;
  title: string;
  prompt: string;
  answer: string | null;
  tags: string[];
  difficulty: string | null;
  category: Category;
  revised: boolean;
  meta: {
    link?: string | null;
    source?: string;
    oa_label?: string | null;
    core_question?: string;
    solution_idea?: string;
    learnings?: string;
    code?: string;
  };
};

// Light row for the problem list (no statement/notes; those load on the drill page).
export type ListRow = {
  id: number;
  kind: Kind;
  title: string;
  tags: string[];
  difficulty: string | null;
  category: Category;
  revised: boolean;
  lc: string | null;
  source: string | null;
  attempts: number;
  solved: number;
  last_outcome: Outcome | null;
  days_since: number | null;
};

// Everything the add/edit form submits.
export type CardInput = {
  kind: Kind;
  title: string;
  prompt: string;
  answer: string;
  tags: string[];
  difficulty: string;
  category: Category;
  revised: boolean;
  link: string;
  core_question: string;
  solution_idea: string;
  learnings: string;
  code: string;
};
