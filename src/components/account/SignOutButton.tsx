"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { Button, type ButtonVariant } from "@/components/ui/Button";

/**
 * The submit button for a `<form action={signOut}>`. The form posts without
 * JavaScript; with it, this shows the pending state.
 */
export function SignOutButton({
  variant = "secondary",
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending} className={className}>
      {pending ? null : <LogOut aria-hidden="true" />}
      Sign out
    </Button>
  );
}
