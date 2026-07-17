import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// A second, Edge-safe NextAuth instance (no Postgres adapter) purely for the
// middleware's session check — `authConfig.callbacks.authorized` decides
// allow/deny and next-auth handles the redirect to /signin.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)"],
};
