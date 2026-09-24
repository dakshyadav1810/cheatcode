import Link from "next/link";

type Tab = "problems" | "drill" | "analytics";

export function Nav({ active }: { active: Tab }) {
  const item = (href: string, label: string, key: Tab) => (
    <Link
      href={href}
      className={key === active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
    >
      {label}
    </Link>
  );
  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b px-4 text-sm">
      <Link href="/" className="text-base font-medium">CheatCode</Link>
      {item("/", "Problems", "problems")}
      {item("/drill?unrevised=1", "Drill", "drill")}
      {item("/analytics", "Analytics", "analytics")}
    </header>
  );
}
