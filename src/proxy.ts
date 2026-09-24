import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const pass = process.env.APP_PASSPHRASE;
  if (!pass) return new NextResponse("APP_PASSPHRASE is not set", { status: 500 });
  if (req.cookies.get(AUTH_COOKIE)?.value === (await authToken(pass))) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
