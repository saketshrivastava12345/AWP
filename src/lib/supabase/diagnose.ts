/**
 * Turns a failed `fetch()` to Supabase into a sentence a developer can act
 * on. Node reports every transport problem as the same `TypeError: fetch
 * failed`; the real reason (DNS, refused, timed out, certificate) sits in
 * the error's `cause` chain, which this reads.
 *
 * Client-safe: no imports.
 */

export type FetchFailure = {
  /** The system error code, when there is one (ENOTFOUND, ECONNREFUSED …). */
  code: string | null;
  /** What happened, in one sentence naming the host. */
  summary: string;
  /** What to do about it. */
  fix: string;
};

/** Hosts left over from `.env.example`. */
export function isPlaceholderHost(host: string): boolean {
  return /your-project-ref|example\.com|xxxx/i.test(host);
}

/** The deepest error in the cause chain that carries a code, or the root. */
function rootCause(error: unknown): { code: string | null; message: string } {
  let current: unknown = error;
  let found: { code: string | null; message: string } = { code: null, message: "" };
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth++) {
    const record = current as { code?: unknown; message?: unknown; cause?: unknown };
    const message = typeof record.message === "string" ? record.message : found.message;
    if (typeof record.code === "string" && record.code !== "") {
      found = { code: record.code, message };
    } else if (found.code === null) {
      found = { code: null, message };
    }
    current = record.cause;
  }
  return found;
}

export function explainFetchFailure(error: unknown, host: string): FetchFailure {
  const { code, message } = rootCause(error);
  const text = `${code ?? ""} ${message}`;

  if (isPlaceholderHost(host)) {
    return {
      code,
      summary: `${host} is the example address from .env.example, not a real project.`,
      fix: "Put your own project URL and publishable key in .env.local (Supabase → Project Settings → Data API / API Keys), then restart `npm run dev`.",
    };
  }
  if (/ENOTFOUND|EAI_AGAIN|EAI_FAIL|getaddrinfo/.test(text)) {
    return {
      code,
      summary: `The name ${host} could not be looked up.`,
      fix: "Check NEXT_PUBLIC_SUPABASE_URL against Project Settings → Data API (the project may have been deleted), and that this machine is online.",
    };
  }
  if (/ECONNREFUSED/.test(text)) {
    return {
      code,
      summary: `${host} refused the connection.`,
      fix: "Nothing is listening at that address. A hosted Supabase project never refuses, so the URL points at the wrong place (a local address with nothing running?).",
    };
  }
  if (/TIMEDOUT|TIMEOUT|ETIMEDOUT/i.test(text)) {
    return {
      code,
      summary: `Connecting to ${host} timed out.`,
      fix: "A firewall, VPN or proxy is blocking it. Note that Node's fetch ignores HTTP(S)_PROXY, so a corporate proxy that works for the browser does not apply here.",
    };
  }
  if (/ENETUNREACH|EHOSTUNREACH/.test(text)) {
    return {
      code,
      summary: `There is no route to ${host}.`,
      fix: "Usually IPv6 is enabled without working connectivity. Start the server with NODE_OPTIONS=--dns-result-order=ipv4first, or fix the network.",
    };
  }
  if (/CERT|certificate|self.signed|UNABLE_TO_VERIFY|altname/i.test(text)) {
    return {
      code,
      summary: `The TLS certificate presented for ${host} was rejected.`,
      fix: "A corporate proxy or antivirus is intercepting HTTPS. Point Node at its CA certificate with NODE_EXTRA_CA_CERTS=<path to the .pem>.",
    };
  }
  if (/ECONNRESET|UND_ERR_SOCKET|socket hang up|EPIPE/i.test(text)) {
    return {
      code,
      summary: `The connection to ${host} was cut off.`,
      fix: "Usually a proxy, VPN or antivirus interfering with the connection. Try another network, or turn the interception off for localhost development.",
    };
  }
  return {
    code,
    summary: `Could not reach ${host}${message ? ` (${message})` : ""}.`,
    fix: "Run `npm run doctor` for a step-by-step check of .env.local, DNS, the API key and the database.",
  };
}
