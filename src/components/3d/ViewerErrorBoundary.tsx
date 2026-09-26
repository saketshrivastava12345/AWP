"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches failures inside the 3D subtree.
 *
 * A malformed or unreachable GLB throws during render, and without a boundary
 * that would take down the whole detail page. The requirement is explicit: a
 * bad model must never crash the page.
 */
export class ViewerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("3D viewer failed:", error, info.componentStack);
    this.props.onError?.();
  }

  override render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
