import type { Category } from "@/lib/types";

export function CategoryDot({ category }: { category: Category }) {
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: `var(--cat-${category})` }}
      title={category}
    />
  );
}
