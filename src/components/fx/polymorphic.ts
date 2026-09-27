import type { ComponentType, ReactNode } from "react";

/**
 * Rendering through a bare `ElementType` does not type-check in this project
 * (R3F augments JSX with three.js elements whose `children` is `never`), so
 * polymorphic FX components narrow to a component that takes any props. The
 * same approach as ui/Container.
 */
export type AnyComponent = ComponentType<
  Record<string, unknown> & { children?: ReactNode; className?: string }
>;
