import { type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type IconButtonVariant = "ghost" | "outline" | "solid" | "overlay";

/**
 * A round, icon-only button. `label` is required: an icon has no accessible
 * name of its own. `md` is 44px, the minimum comfortable touch target; `sm`
 * draws 36px but keeps a 44px hit area.
 *
 * `overlay` is for controls that sit on a photograph or a canvas (the
 * favourite heart on a card, a viewer control): a dark, blurred disc that
 * stays legible over any image.
 */
export function IconButton({
  label,
  children,
  size = "md",
  variant = "ghost",
  pressed,
  className,
  type = "button",
  ...props
}: Omit<ComponentProps<"button">, "aria-label"> & {
  label: string;
  children: ReactNode;
  size?: "sm" | "md";
  variant?: IconButtonVariant;
  /** Renders aria-pressed for toggle buttons. */
  pressed?: boolean;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-pill",
        "transition-[color,background-color,border-color] duration-(--duration-fast) ease-standard",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm"
          ? "size-9 after:absolute after:-inset-1 after:rounded-pill after:content-['']"
          : "size-11",
        variant === "ghost" && "text-ink-200 hover:bg-white/6 hover:text-ink-50",
        variant === "outline" &&
          "border border-line-strong text-ink-200 hover:border-ink-400 hover:text-ink-50",
        variant === "solid" && "bg-surface-2 text-ink-100 hover:bg-surface-3",
        variant === "overlay" &&
          "bg-void/60 text-ink-50 backdrop-blur-md hover:bg-void/80",
        // Active state: the gold rule allows gold for "on", nothing else.
        pressed && "border border-gold-500 bg-surface-3 text-ink-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
