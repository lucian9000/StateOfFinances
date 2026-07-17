import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — no providers, no Postgres adapter here (an Email
 * provider forces Auth.js to require an adapter even just to build the
 * NextAuth instance, and middleware doesn't need providers at all — it only
 * checks the existing JWT session cookie). The full config in auth.ts adds
 * the Resend provider + adapter for the actual sign-in flow.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true, // behind the Tailscale Funnel reverse proxy in production
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/verify",
    error: "/signin",
  },
  session: { strategy: "jwt" },
};
