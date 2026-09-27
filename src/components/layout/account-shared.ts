/**
 * Values shared by the server account slot (AccountMenu.tsx) and the client
 * menu button. They live here, not in the "use client" module: a server
 * component that imports a plain value from a client module receives a
 * client reference instead of the value — a class string imported that way
 * silently renders as no classes at all.
 */

/**
 * Fixed footprint of the navbar's account control, shared by the "Sign in"
 * link, the signed-in menu button and the streaming fallback, so nothing
 * shifts when the session-dependent slot arrives.
 */
export const ACCOUNT_BOX = "h-10 w-10 shrink-0 xl:w-36";

export type AccountSummary = {
  name: string;
  email: string | null;
  initial: string;
  isAdmin: boolean;
};
