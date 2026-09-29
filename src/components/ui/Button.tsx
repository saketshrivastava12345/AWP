import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

/* HUD keys: Michroma, uppercase, tracked, on a chamfered plate. The plate,
   its edge and the hover light-sweep are drawn by the `fx-btn` classes in
   globals.css (on pseudo-elements, so the focus ring is never clipped). */
const BASE =
  "group/button inline-flex items-center justify-center gap-2.5 font-hud uppercase " +
  "tracking-button whitespace-nowrap rounded-control " +
  "disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  // Cyan plate with a glow. One per view.
  primary: "fx-btn fx-btn--primary",
  secondary: "fx-btn fx-btn--secondary",
  ghost: "fx-btn fx-btn--ghost",
  danger: "fx-btn fx-btn--danger",
  // Text plus an arrow that nudges forward on hover, with an underline that
  // grows from the left. No plate, but a 44px-tall hit area.
  link:
    "min-h-11 rounded-xs px-0 font-sans normal-case tracking-normal font-medium " +
    "text-ink-100 transition-colors duration-(--duration-fast) hover:text-cyan-200",
};

const SIZES: Record<ButtonSize, string> = {
  // A 44px box with the plate drawn 40px tall (--btn-inset), so the hit
  // area stays 44px.
  sm: "h-11 px-4 text-[10.5px] [--btn-inset:2px] [--btn-ch:7px] [&_svg]:size-4",
  md: "h-12 px-6 text-[11.5px] [&_svg]:size-[18px]",
  lg: "h-14 px-8 text-[12.5px] [--btn-ch:11px] [&_svg]:size-[18px]",
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
        "shrink-0 text-cyan-300 transition-[translate,color] duration-(--duration-base) ease-standard",
        "group-hover/button:translate-x-1 group-hover/button:text-cyan-200",
        "group-focus-visible/button:translate-x-1 motion-reduce:translate-x-0",
      )}
    />
  );
}

/** Link-variant label: an underline grows under it on hover/focus. */
function LinkLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[inherit] bg-linear-to-r from-cyan-300 to-cyan-300 pb-0.5",
        "bg-size-[0%_1px] bg-bottom-left bg-no-repeat",
        "transition-[background-size] duration-(--duration-base) ease-standard",
        "group-hover/button:bg-size-[100%_1px] group-focus-visible/button:bg-size-[100%_1px]",
      )}
    >
      {children}
    </span>
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
  /**
   * Drifts toward the cursor while hovered (desktop, not under reduced
   * motion). Use on the one hero CTA, not on every button.
   */
  magnetic?: boolean;
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
  magnetic = false,
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
      data-magnetic={magnetic ? "0.25" : undefined}
      suppressHydrationWarning={magnetic || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {variant === "link" ? <LinkLabel>{children}</LinkLabel> : children}
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
  magnetic = false,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses(variant, size, className)}
      data-magnetic={magnetic ? "0.25" : undefined}
      suppressHydrationWarning={magnetic || undefined}
      {...props}
    >
      {variant === "link" ? <LinkLabel>{children}</LinkLabel> : children}
      {variant === "link" && arrow !== false ? <LinkArrow /> : null}
    </Link>
  );
}
