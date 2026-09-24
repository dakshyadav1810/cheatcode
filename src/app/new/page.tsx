import { Nav } from "@/components/nav";
import { CardForm } from "@/components/card-form";
import { knownTags } from "@/lib/queries";
import type { Kind } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewCard({ searchParams }: PageProps<"/new">) {
  const k = (await searchParams).kind;
  const kind = (["dsa", "os", "oop"].includes(k as string) ? k : "dsa") as Kind;
  return (
    <>
      <Nav active="problems" />
      <CardForm initialKind={kind} knownTags={await knownTags()} />
    </>
  );
}
