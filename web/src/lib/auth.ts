import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "./db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
      const submitted = user.email?.trim().toLowerCase();
      return Boolean(allowed && submitted && submitted === allowed);
    },
  },
});
