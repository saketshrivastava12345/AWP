import { type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A square, icon-only button. `label` is required: an icon has no accessible
 * name of its own. `md` is 44px, the minimum comfortable touch target.
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
  variant?: "ghost" | "outline" | "solid";
  /** Renders aria-pressed for toggle buttons. */
  pressed?: boolean;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-sm transition-colors duration-(--duration-fast)",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "size-9" : "size-11",
        variant === "ghost" && "text-ink-300 hover:bg-surface-2 hover:text-ink-50",
        variant === "outline" &&
          "border border-line-strong text-ink-200 hover:border-gold-600 hover:text-gold-300",
        variant === "solid" && "bg-surface-2 text-ink-100 hover:bg-surface-3",
        pressed && "border-gold-600 bg-gold-500/10 text-gold-300",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
