import Link from "next/link";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 font-display uppercase " +
  "tracking-[0.14em] whitespace-nowrap rounded-xs transition-colors duration-200 " +
  "ease-[var(--ease-cinematic)] disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  // The single filled element in the system. Used sparingly — one per view.
  primary:
    "bg-gold-500 text-void hover:bg-gold-400 active:bg-gold-600 " +
    "shadow-[0_1px_0_0_var(--color-gold-300)_inset]",
  secondary:
    "border border-line-strong text-ink-100 hover:border-gold-500 " +
    "hover:text-gold-300 bg-transparent",
  ghost: "text-ink-300 hover:text-ink-50 hover:bg-surface-2",
  danger:
    "border border-signal-negative/40 text-signal-negative hover:bg-signal-negative/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[10px]",
  md: "h-11 px-6 text-[11px]",
  lg: "h-14 px-9 text-xs",
};

function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
};

type ButtonProps = SharedProps & ComponentPropsWithoutRef<"button">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

type ButtonLinkProps = SharedProps & ComponentPropsWithoutRef<typeof Link>;

/**
 * A link styled as a button.
 *
 * Kept as a separate component rather than a polymorphic `as` prop: navigation
 * must render a real anchor for middle-click, "open in new tab" and screen
 * readers, and splitting the two keeps both sets of props correctly typed.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
