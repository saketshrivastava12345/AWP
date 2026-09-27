import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell, AuthShellSkeleton } from "@/components/account/AuthShell";
import { PasswordForm } from "@/components/account/PasswordForm";
import { getPasswordChangeContext } from "@/lib/queries/auth";

export const metadata: Metadata = {
  title: "Change password",
  description: "Choose a new password for your AURIX account.",
  robots: { index: false, follow: false },
};

async function PasswordScreen() {
  const context = await getPasswordChangeContext();
  if (!context) redirect("/login?next=%2Faccount%2Fpassword");

  return (
    <AuthShell
      overline="Security"
      code="SYS.03"
      title={context.viaEmailLink ? "Choose a new password" : "Change your password"}
      description={
        context.viaEmailLink
          ? "Your reset link worked. Choose a new password to finish."
          : "Confirm your current password, then choose a new one. Other devices signed in to this account will be signed out."
      }
    >
      <PasswordForm email={context.user.email} requireCurrent={!context.viaEmailLink} />
    </AuthShell>
  );
}

/**
 * /account/password — also where a password-reset email lands (through
 * /auth/confirm). Signed-in only.
 */
export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<AuthShellSkeleton />}>
      <PasswordScreen />
    </Suspense>
  );
}
