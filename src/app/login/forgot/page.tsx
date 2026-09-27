import type { Metadata } from "next";
import { AuthShell } from "@/components/account/AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Get a link to choose a new password.",
  robots: { index: false, follow: false },
};

/** Static: the form posts to a server action and reads nothing on render. */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email address you signed up with. If it has an account, we’ll send a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
