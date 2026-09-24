export const CATEGORIES = ["green", "yellow", "red", "gold", "unclassified"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Outcome = "solved" | "hint" | "failed";
export type Kind = "dsa" | "os" | "oop";

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
  attempts: number;
  solved: number;
  last_outcome: Outcome | null;
  days_since: number | null;
};
