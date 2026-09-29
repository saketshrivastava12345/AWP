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
        variant === "ghost" && "text-ink-200 hover:bg-cyan-400/8 hover:text-cyan-100",
        variant === "outline" &&
          "border border-line-strong text-ink-200 hover:border-cyan-300 hover:text-cyan-100 hover:shadow-[0_0_14px_-4px_var(--color-cyan-400)]",
        variant === "solid" && "bg-surface-2 text-ink-100 hover:bg-surface-3",
        variant === "overlay" &&
          "bg-void/60 text-ink-50 backdrop-blur-md hover:bg-void/80",
        // Active ("on") state: lit cyan.
        pressed &&
          "border border-cyan-300 bg-cyan-400/12 text-cyan-100 shadow-[0_0_14px_-3px_var(--color-cyan-400)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
