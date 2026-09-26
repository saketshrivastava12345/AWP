import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "./LoginForm";
import { getSessionUser } from "@/lib/queries/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save cars to your favourites.",
};

export default async function LoginPage() {
  // Already signed in? There is nothing to do here.
  const user = await getSessionUser();
  if (user) redirect("/favorites");

  return (
    <Container className="grain flex flex-1 flex-col items-center justify-center py-24">
      <div className="relative z-10 w-full max-w-sm">
        <p className="text-label">Account</p>
        <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50">
          SIGN IN
        </h1>
        <p className="mt-4 mb-10 text-sm leading-relaxed text-ink-400">
          Save cars to your favourites and pick up where you left off.
        </p>
        <LoginForm />
      </div>
    </Container>
  );
}
