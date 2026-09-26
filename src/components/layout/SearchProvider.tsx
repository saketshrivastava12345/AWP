"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SearchContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * Owns the search overlay's open state so that anything on the page — the
 * navbar button, a hero CTA, an empty state — can open it, and so the
 * Ctrl/Cmd+K shortcut is registered exactly once.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // metaKey for macOS, ctrlKey elsewhere.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchOverlay(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchOverlay must be used inside <SearchProvider>.");
  }
  return context;
}
