import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const pass = process.env.APP_PASSPHRASE;
  if (!pass || formData.get("passphrase") !== pass) redirect("/login?error=1");
  (await cookies()).set(AUTH_COOKIE, await authToken(pass), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  redirect("/");
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const error = (await searchParams).error;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form action={login} className="flex w-full max-w-xs flex-col gap-3">
        <h1 className="text-lg font-bold">CheatCode</h1>
        <input
          name="passphrase"
          type="password"
          autoFocus
          required
          placeholder="passphrase"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
        />
        {error && <p className="text-sm text-destructive">Wrong passphrase</p>}
        <Button type="submit">Enter</Button>
      </form>
    </main>
  );
}
