"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches failures inside a 3D subtree, so a bad model, a shader that will not
 * compile or a lost context never takes the page down.
 *
 * Used twice over: around every canvas from the outside (R3F rethrows errors
 * from inside a Canvas into the DOM tree) and inside the viewer's canvas
 * around a GLB, where the fallback is the procedural car.
 *
 * `resetKeys`: when any of them changes (a different model, a retry) the
 * boundary clears its error and tries its children again. Without that a
 * single failure would stick for the life of the page.
 */
type Props = {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: readonly unknown[];
  /** Short name for the console, e.g. "viewer", "tour". */
  label?: string;
  /**
   * The failure is expected and handled (a GLB that will not load, with the
   * procedural car standing in): log a warning rather than an error.
   */
  expected?: boolean;
};

type State = { error: Error | null; keys: readonly unknown[] };

const changed = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]));

export class ModelErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, keys: this.props.resetKeys ?? [] };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const keys = props.resetKeys ?? [];
    if (changed(keys, state.keys)) return { error: null, keys };
    return null;
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const log = this.props.expected ? console.warn : console.error;
    log(`3D ${this.props.label ?? "scene"} failed:`, error, info.componentStack);
    this.props.onError?.(error);
  }

  override render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}
