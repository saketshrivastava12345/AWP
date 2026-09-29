"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { compareHref, MIN_COMPARE } from "@/lib/compare-slug";

type CompareState = {
  /** Canonical slugs of the cars in the comparison, in order. */
  selected: string[];
  /** "Show differences only". */
  diff: boolean;
  setDiff: (next: boolean) => void;
  /** The address of the current comparison, including the diff flag. */
  href: string;
};

const CompareContext = createContext<CompareState | null>(null);

/**
 * The comparison's URL state, shared by the picker, the toolbar and every
 * add/remove link.
 *
 * The address bar is the source of truth: the server reads `?car=` and
 * `?diff=`, and this provider writes back the canonical form — dropping
 * anything the server could not resolve, so a copied URL never carries a
 * phantom car — and keeps `diff` in sync when it is toggled. The toggle
 * itself is instant (no server round trip); `history.replaceState` is
 * integrated with the Next router, so back/forward and useSearchParams stay
 * consistent.
 */
export function CompareStateProvider({
  selected,
  initialDiff,
  children,
}: {
  selected: string[];
  initialDiff: boolean;
  children: ReactNode;
}) {
  const [diff, setDiffState] = useState(initialDiff);
  // A navigation that arrives with a different ?diff= (back/forward) wins
  // over the local toggle. Adjusted during render, React's pattern for
  // "reset state when a prop changes".
  const [lastInitial, setLastInitial] = useState(initialDiff);
  if (initialDiff !== lastInitial) {
    setLastInitial(initialDiff);
    setDiffState(initialDiff);
  }
  const canDiff = selected.length >= MIN_COMPARE;
  const effectiveDiff = canDiff && diff;
  const href = compareHref(selected, { diff: effectiveDiff });

  // Rewrite the address bar to the canonical comparison. Runs after every
  // change of selection or flag; a no-op when the URL already matches.
  useEffect(() => {
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== href) {
      window.history.replaceState(null, "", `${href}${window.location.hash}`);
    }
  }, [href]);

  const setDiff = useCallback((next: boolean) => setDiffState(next), []);

  const value = useMemo(
    () => ({ selected, diff: effectiveDiff, setDiff, href }),
    [selected, effectiveDiff, setDiff, href],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompareState(): CompareState {
  const value = useContext(CompareContext);
  if (!value) throw new Error("useCompareState must be used inside CompareStateProvider");
  return value;
}

/**
 * A link to another comparison (a car added or removed) that keeps the
 * current "differences only" choice. Rendered by server components, so each
 * one is a real anchor that works before hydration.
 */
export function CompareLink({
  to,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  /** The slugs of the comparison to open. */
  to: string[];
  children: ReactNode;
}) {
  const { diff } = useCompareState();
  return (
    <Link
      href={compareHref(to, { diff: diff && to.length >= MIN_COMPARE })}
      scroll={false}
      {...props}
    >
      {children}
    </Link>
  );
}
