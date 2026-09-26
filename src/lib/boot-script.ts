/**
 * Session key marking that the cinematic loading screen has already played.
 * Shared between the pre-paint inline script and the React component.
 */
export const BOOT_SESSION_KEY = "aurix-booted";

/**
 * Runs before first paint, injected into <head>.
 *
 * The loading screen is server-rendered so it covers the page from the first
 * byte. On a repeat visit within the same session we do not want it at all,
 * and waiting for React to hydrate before hiding it would show a visible
 * flash. This marks the document synchronously instead; the CSS rule for
 * `html[data-booted="1"] #aurix-loading-screen` in globals.css then hides the
 * screen before it is ever painted.
 *
 * Deliberately in its own module with no "use client": importing it from the
 * client component would drag that component into the server layout's graph.
 */
export const BOOT_FLAG_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(
  BOOT_SESSION_KEY,
)}))document.documentElement.setAttribute("data-booted","1")}catch(e){}`;
