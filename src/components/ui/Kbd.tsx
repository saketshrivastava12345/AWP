"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-cyan-400/25",
        "bg-surface-2 px-1 font-mono text-nano leading-none text-cyan-200",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

const subscribe = () => () => {};
const isApple = () =>
  /mac|iphone|ipad|ipod/i.test(
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ?? navigator.platform,
  );

/**
 * The platform's modifier for a shortcut: ⌘ on Apple devices, Ctrl elsewhere.
 * Renders "Ctrl" on the server and corrects itself after hydration.
 */
export function ShortcutHint({
  keyName,
  className,
}: {
  keyName: string;
  className?: string;
}) {
  const apple = useSyncExternalStore(subscribe, isApple, () => false);
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-hidden="true"
    >
      <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>{keyName}</Kbd>
    </span>
  );
}
