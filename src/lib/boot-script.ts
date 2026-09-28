import {
  FX_LITE_CLASS,
  FX_LITE_SESSION_KEY,
  FX_MODE_STORAGE_KEY,
  LITE_MAX_CORES,
  LITE_MAX_MEMORY_GB,
} from "@/components/fx/fx-lite";

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
/*
 * It also adds the `js` class to <html>. Every "hidden until revealed" state
 * in the FX motion kit (Reveal, stagger) is gated on `html.js`, so a visitor
 * without JavaScript — or whose scripts are blocked — sees all content; the
 * class is set before first paint, so nothing flashes for everyone else.
 *
 * And it decides the FX "lite" mode (src/components/fx/fx-lite.ts) before
 * the first frame, so a low-power device never starts the ambient loops only
 * to have them stopped a moment later: an explicit localStorage choice wins;
 * otherwise few cores, little memory, Data Saver, or a slow-frame verdict
 * earlier in this session turn it on.
 */
export const BOOT_FLAG_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");try{if(sessionStorage.getItem(${JSON.stringify(
  BOOT_SESSION_KEY,
)}))d.setAttribute("data-booted","1")}catch(e){}try{var o=null;try{o=localStorage.getItem(${JSON.stringify(
  FX_MODE_STORAGE_KEY,
)})}catch(e){}var n=navigator,c=n.connection,s=null;try{s=sessionStorage.getItem(${JSON.stringify(
  FX_LITE_SESSION_KEY,
)})}catch(e){}if(o==="lite"||(o!=="full"&&((n.hardwareConcurrency>0&&n.hardwareConcurrency<=${LITE_MAX_CORES})||(n.deviceMemory>0&&n.deviceMemory<=${LITE_MAX_MEMORY_GB})||(c&&c.saveData===true)||s==="1")))d.classList.add(${JSON.stringify(
  FX_LITE_CLASS,
)})}catch(e){}})();`;
