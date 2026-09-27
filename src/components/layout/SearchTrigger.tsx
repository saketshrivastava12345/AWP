"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { ShortcutHint } from "@/components/ui/Kbd";
import { cn } from "@/lib/utils";
import { useSearchOverlay } from "./SearchProvider";

/**
 * A search-field-shaped button that opens the command palette. For places
 * outside the navbar — the footer, the 404 page, an empty state — that want
 * to offer search without a form of their own.
 */
export function SearchTrigger({
  children = "Search the catalogue",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { open } = useSearchOverlay();
  return (
    <button
      type="button"
      onClick={open}
      aria-keyshortcuts="Control+K Meta+K /"
      className={cn(
        "group flex h-11 w-full max-w-sm items-center gap-3 rounded-sm border border-line bg-surface-1/60 px-4",
        "text-left text-sm text-ink-400 transition-colors duration-(--duration-fast)",
        "hover:border-line-strong hover:text-ink-200",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-gold-500" aria-hidden="true" />
      <span className="flex-1 truncate">{children}</span>
      <ShortcutHint keyName="K" className="hidden sm:inline-flex" />
    </button>
  );
}
