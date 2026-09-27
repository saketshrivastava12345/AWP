/**
 * Pieces of the loading screen that the server layout needs. Kept out of the
 * "use client" component: a value imported from a client module into a server
 * component arrives as a client reference, not as the value itself.
 */

/** id of the loading-screen element; the CSS rules below target it. */
export const LOADING_SCREEN_ID = "aurix-loading-screen";

/**
 * Markup for a <noscript> in <head>. Without JavaScript nothing would ever
 * dismiss the server-rendered overlay, so a visitor with scripts disabled
 * would face an opaque screen forever; this hides it before first paint.
 */
export const LOADING_SCREEN_NOSCRIPT = `<style>#${LOADING_SCREEN_ID}{display:none!important}</style>`;
