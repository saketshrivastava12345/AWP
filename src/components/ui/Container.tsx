import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page width and side gutters, defined in exactly one place.
 *
 * The gutter is horizontal padding on this element only, so nothing inside
 * needs to reason about edge spacing at small widths.
 */
/**
 * Rendering through a bare `ElementType` stopped type-checking once
 * @react-three/fiber v9 was added: R3F augments the global JSX namespace with
 * three.js elements, several of which declare `children: never`, and the
 * union then collapses to that. Narrowing to a component type that accepts
 * arbitrary props and children keeps the polymorphism without inheriting the
 * three.js element signatures — none of which this component can ever be.
 */
type PolymorphicProps = Record<string, unknown> & {
  children?: ReactNode;
  className?: string;
};

export function Container({
  children,
  className,
  as,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  size?: "default" | "wide" | "narrow";
}) {
  const Component = (as ?? "div") as React.ComponentType<PolymorphicProps>;

  return (
    <Component
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        size === "narrow" && "max-w-3xl",
        size === "default" && "max-w-7xl",
        size === "wide" && "max-w-[1600px]",
        className,
      )}
    >
      {children}
    </Component>
  );
}
