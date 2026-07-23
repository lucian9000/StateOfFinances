import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Server-side auth guard for pages. Middleware already gates these routes, but
 * relying on middleware alone is fragile (matcher gaps, misconfig, past Next.js
 * middleware-bypass CVEs). Calling this at the top of every data-bearing page
 * means financial data is never rendered without a valid session, even if the
 * edge layer is bypassed — defense in depth, per the Auth.js recommendation.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  return session;
}
