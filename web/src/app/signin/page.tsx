import { signIn } from "@/lib/auth";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="font-display text-2xl font-semibold text-text">StateOfFinances</h1>
      <p className="mt-2 text-sm text-text-muted">Sign in with your email to continue.</p>

      <form
        className="mt-8 w-full max-w-xs"
        action={async (formData) => {
          "use server";
          await signIn("resend", { email: formData.get("email"), redirectTo: "/" });
        }}
      >
        <input
          type="email"
          name="email"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="you@example.com"
          className="w-full rounded-card border border-white/10 bg-surface px-4 py-3 text-text placeholder:text-text-muted focus:border-violet focus:outline-none"
        />
        <button
          type="submit"
          className="mt-3 w-full rounded-card bg-violet px-4 py-3 font-medium text-text transition hover:opacity-90"
        >
          Send magic link
        </button>
      </form>

      {searchParams.error && (
        <p className="mt-4 text-sm text-magenta">
          That email isn&apos;t authorized for this app.
        </p>
      )}
    </div>
  );
}
