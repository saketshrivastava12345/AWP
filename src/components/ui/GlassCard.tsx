import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassCardOwnProps = {
  children: ReactNode;
  className?: string;
  /**
   * Adds hover affordances. Only set this when the card is actually a link or
   * a button — a static card that lights up on hover reads as broken.
   */
  interactive?: boolean;
  /** Brushed-metal highlight along the top edge. */
  edgeLight?: boolean;
  /**
   * Frosts whatever is behind the card. Off by default: every backdrop-filter
   * is its own compositing layer, a grid of fifty cards would stack fifty of
   * them (expensive on phones), and over the flat void ground the blur has
   * nothing to show anyway. Turn it on only for a card that floats over
   * imagery, a canvas or moving content.
   */
  blur?: boolean;
  /** HUD corner brackets (always shown; interactive cards light them on hover). */
  brackets?: boolean;
};

/**
 * Polymorphic so a card can render as a `Link`, `article`, `li` or `button`
 * while keeping that element's own props correctly typed — `href` on a Link,
 * `disabled` on a button, and so on.
 */
type GlassCardProps<T extends ElementType> = GlassCardOwnProps & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof GlassCardOwnProps | "as">;

/**
 * The standard raised surface, HUD style: a tinted panel with a cool
 * hairline border. Interactive cards (links/buttons) lift, light their
 * border cyan and carry a pointer-following spotlight (`fx-card` +
 * `data-spotlight`, driven by the FX runtime). Callers can still add their
 * own border/background classes.
 */
export function GlassCard<T extends ElementType = "div">({
  children,
  className,
  as,
  interactive = false,
  edgeLight = false,
  blur = false,
  brackets = false,
  ...rest
}: GlassCardProps<T>) {
  // See the note in Container.tsx: R3F v9 poisons a bare ElementType render.
  const Component = (as ?? "div") as React.ComponentType<
    Record<string, unknown> & { children?: ReactNode; className?: string }
  >;

  return (
    <Component
      className={cn(
        "group/card relative rounded-card border border-line",
        blur ? "bg-surface-1/70 backdrop-blur-md" : "bg-surface-1/85",
        edgeLight && "edge-light",
        interactive && "fx-card",
        className,
      )}
      data-spotlight={interactive ? "" : undefined}
      {...rest}
    >
      {brackets ? (
        <span
          aria-hidden="true"
          className={cn(
            "hud-brackets -m-px [--hud-l:10px]",
            interactive &&
              "opacity-50 transition-opacity duration-(--duration-base) group-hover/card:opacity-100",
          )}
        />
      ) : null}
      {children}
    </Component>
  );
}
