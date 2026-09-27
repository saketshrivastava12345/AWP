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
 * The standard raised surface: a hairline border over a barely-lifted ground.
 */
export function GlassCard<T extends ElementType = "div">({
  children,
  className,
  as,
  interactive = false,
  edgeLight = true,
  blur = false,
  ...rest
}: GlassCardProps<T>) {
  // See the note in Container.tsx: R3F v9 poisons a bare ElementType render.
  const Component = (as ?? "div") as React.ComponentType<
    Record<string, unknown> & { children?: ReactNode; className?: string }
  >;

  return (
    <Component
      className={cn(
        "relative rounded-md border border-line",
        blur ? "bg-surface-1/70 backdrop-blur-md" : "bg-surface-1/80",
        edgeLight && "edge-light",
        interactive &&
          "transition-colors duration-(--duration-fast) ease-cinematic " +
            "hover:border-line-strong hover:bg-surface-2/80",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
