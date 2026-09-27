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
        "group flex h-12 w-full max-w-sm items-center gap-3 rounded-control border border-line-strong bg-surface-1 px-4",
        "text-left text-[15px] text-ink-400 transition-colors duration-(--duration-fast)",
        "hover:border-ink-500 hover:text-ink-200",
        className,
      )}
    >
      <Search className="size-[18px] shrink-0 text-ink-300" aria-hidden="true" />
      <span className="flex-1 truncate">{children}</span>
      <ShortcutHint keyName="K" className="hidden sm:inline-flex" />
    </button>
  );
}
