import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AnyComponent } from "./polymorphic";

/**
 * A HUD panel: glass ground, a luminous gradient border (cyan → violet),
 * four corner brackets and an optional tiny mono label riding the top edge
 * ("SYS.01 // SPEC"). The label and `code` are decoration — aria-hidden —
 * so never put information only there; use a real heading inside.
 *
 * `tone="gold"` for premium/brand panels. `padded` (default) adds p-5/p-6.
 * Polymorphic (`as="section"`, `as="article"`, `as={Link}`).
 */
export function HudFrame({
  as,
  label,
  code,
  tone = "cyan",
  padded = true,
  brackets = true,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  /** Decorative label on the top edge, e.g. "DATA // SPEC". */
  label?: string;
  /** Decorative code at the top-right, e.g. "01". */
  code?: string;
  tone?: "cyan" | "gold" | "violet";
  padded?: boolean;
  brackets?: boolean;
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>) {
  const Component = (as ?? "div") as AnyComponent;
  const bracketColor =
    tone === "gold"
      ? "[--hud-c:var(--color-gold-400)]"
      : tone === "violet"
        ? "[--hud-c:var(--color-violet-400)]"
        : "[--hud-c:var(--color-cyan-300)]";
  return (
    <Component
      {...rest}
      className={cn(
        "relative rounded-card hud-panel",
        tone === "gold" &&
          "[--panel-edge:linear-gradient(135deg,oklch(0.8_0.11_85/55%),oklch(0.9_0.03_230/10%)_40%,oklch(0.9_0.03_230/8%)_65%,oklch(0.8_0.11_85/30%))]",
        tone === "violet" &&
          "[--panel-edge:linear-gradient(135deg,oklch(0.7_0.17_290/55%),oklch(0.9_0.03_230/10%)_40%,oklch(0.9_0.03_230/8%)_65%,oklch(0.83_0.13_210/35%))]",
        padded && "p-5 sm:p-6",
        className,
      )}
    >
      {brackets ? (
        <span aria-hidden="true" className={cn("hud-brackets -m-px", bracketColor)} />
      ) : null}
      {label ? (
        <span
          aria-hidden="true"
          className="absolute -top-[5px] left-5 bg-void px-1.5 hud-label leading-[10px]"
        >
          {label}
        </span>
      ) : null}
      {code ? (
        <span
          aria-hidden="true"
          className="absolute top-2.5 right-3 hud-label text-ink-600"
        >
          {code}
        </span>
      ) : null}
      {children}
    </Component>
  );
}
