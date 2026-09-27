import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

/* Sentence case, no tracking: a product-site button, not a HUD key. */
const BASE =
  "group/button inline-flex items-center justify-center gap-2 font-display font-medium " +
  "whitespace-nowrap rounded-control transition-[color,background-color,border-color] " +
  "duration-(--duration-fast) ease-standard disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  // The single filled element in the system. One per view.
  primary: "bg-gold-500 text-void hover:bg-gold-400 active:bg-gold-600",
  secondary:
    "border border-line-strong bg-transparent text-ink-50 hover:border-ink-400 hover:bg-white/6",
  ghost: "text-ink-200 hover:bg-white/5 hover:text-ink-50",
  danger:
    "border border-signal-negative/40 text-signal-negative hover:bg-signal-negative/10",
  // Text plus an arrow that nudges forward on hover. Replaces every
  // "PROFILE →" / "VIEW ALL" micro-link. No box, but a 44px-tall hit area.
  link: "min-h-11 rounded-xs px-0 text-ink-100 hover:text-ink-50",
};

const SIZES: Record<ButtonSize, string> = {
  // 40px drawn; the pseudo-element extends the hit area to 44px.
  sm:
    "relative h-10 px-4 text-sm [&_svg]:size-4 " +
    "after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
  md: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
  lg: "h-14 px-8 text-base [&_svg]:size-[18px]",
};

/* The link variant keeps the type size but drops the box geometry. */
const LINK_SIZES: Record<ButtonSize, string> = {
  sm: "text-sm [&_svg]:size-4",
  md: "text-[15px] [&_svg]:size-[18px]",
  lg: "text-base [&_svg]:size-[18px]",
};

/**
 * The class string for a button of the given variant and size. Exported for
 * the rare element that must look like a button but cannot be one of these
 * components (a <summary>, a label wrapping a file input).
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    BASE,
    VARIANTS[variant],
    variant === "link" ? LINK_SIZES[size] : SIZES[size],
    className,
  );
}

/** The trailing arrow of the link variant. */
function LinkArrow() {
  return (
    <ArrowRight
      aria-hidden="true"
      className={cn(
        "shrink-0 text-ink-400 transition-[translate,color] duration-(--duration-base) ease-standard",
        "group-hover/button:translate-x-1 group-hover/button:text-ink-50",
        "group-focus-visible/button:translate-x-1 motion-reduce:translate-x-0",
      )}
    />
  );
}

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
  /**
   * The link variant's trailing arrow. On by default for `variant="link"`;
   * pass false for a plain text action ("Clear all").
   */
  arrow?: boolean;
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
  arrow,
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
      {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {children}
      {variant === "link" && arrow !== false ? <LinkArrow /> : null}
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
  arrow,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
      {variant === "link" && arrow !== false ? <LinkArrow /> : null}
    </Link>
  );
}
