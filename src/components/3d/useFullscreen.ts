"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function leaveNativeFullscreen() {
  if (!fullscreenElement()) return;
  const doc = document as WebkitDocument;
  const leave = doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc);
  void Promise.resolve(leave?.()).catch(() => undefined);
}

/**
 * Fullscreen for one viewer.
 *
 * The *document* goes fullscreen and the viewer lays itself over the window,
 * rather than the viewer element itself going fullscreen. Only the fullscreen
 * element's subtree is painted in native fullscreen, and every dialog in this
 * app is portalled to <body> — so fullscreening the element would open the
 * subsystem panel and the configurator sheet invisibly behind it.
 *
 * Where the Fullscreen API is missing or refused (iPhone Safari only
 * fullscreens video) the same full-window layout is used on its own. Escape
 * leaves both; an open dialog takes the key first.
 *
 * `ref` is the element that should fill the window; it is only read to decide
 * whether the viewer is still mounted.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>): {
  /** The viewer fills the window (natively fullscreen or not). */
  active: boolean;
  /** True when the Fullscreen API was unavailable and only the layout is in use. */
  pseudo: boolean;
  toggle: () => void;
  exit: () => void;
} {
  const [native, setNative] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  /** This viewer asked for the current native fullscreen session. */
  const owns = useRef(false);

  useEffect(() => {
    const sync = () => {
      if (fullscreenElement()) {
        setNative(owns.current);
      } else {
        owns.current = false;
        setNative(false);
      }
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      // Navigating away while fullscreen must not leave the next page stuck
      // in a fullscreen session nobody on it asked for.
      if (owns.current) {
        owns.current = false;
        leaveNativeFullscreen();
      }
    };
  }, []);

  useLockBodyScroll(native || pseudo);

  const exit = useCallback(() => {
    if (owns.current) leaveNativeFullscreen();
    setPseudo(false);
  }, []);

  // Browsers normally consume Escape themselves to leave native fullscreen,
  // but not every one does (embedded and automated browsers deliver the key
  // to the page), and the full-window fallback always needs it.
  useEffect(() => {
    if (!pseudo && !native) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("[data-aurix-dialog]")) return;
      exit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pseudo, native, exit]);

  const toggle = useCallback(() => {
    if (!ref.current) return;
    if (native || pseudo) {
      exit();
      return;
    }
    const root = document.documentElement as WebkitElement;
    const doc = document as WebkitDocument;
    const request =
      root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
    const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? true;
    if (!request || !enabled || fullscreenElement()) {
      setPseudo(true);
      return;
    }
    owns.current = true;
    void Promise.resolve(request()).catch(() => {
      owns.current = false;
      setPseudo(true);
    });
  }, [ref, native, pseudo, exit]);

  return { active: native || pseudo, pseudo, toggle, exit };
}
