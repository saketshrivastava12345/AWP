import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 font-display uppercase " +
  "tracking-button whitespace-nowrap rounded-xs transition-colors duration-(--duration-fast) " +
  "ease-cinematic disabled:pointer-events-none disabled:opacity-40";

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
  sm: "h-9 px-3 text-micro",
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

type ButtonProps = SharedProps &
  ComponentProps<"button"> & {
    /** Shows a spinner, blocks activation and marks it busy (focus is kept). */
    loading?: boolean;
  };

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  loading = false,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  // While loading the button stays focusable (aria-disabled, not disabled):
  // disabling the focused element would drop keyboard focus to <body>.
  return (
    <button
      type={type}
      className={buttonClasses(
        variant,
        size,
        cn(loading && "pointer-events-none opacity-40", className),
      )}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={loading ? (event) => event.preventDefault() : onClick}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = SharedProps & ComponentProps<typeof Link>;

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
