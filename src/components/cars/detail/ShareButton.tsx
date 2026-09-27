"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

/**
 * Share this car.
 *
 * On touch devices with the Web Share API it opens the system share sheet
 * (the "mobile" case). Everywhere else — including desktop browsers that do
 * implement navigator.share, where a copied link is what people expect — it
 * copies the canonical URL and confirms with a toast. Dismissing the share
 * sheet (AbortError) is silent; any other failure falls back to copying, and
 * if even that is impossible the toast shows the URL to copy by hand.
 *
 * Props:
 *   url    canonical URL of the page (not window.location, which may carry
 *          tracking parameters or a stale hash)
 *   title  share-sheet title, e.g. "Porsche 911 GT3"
 *   text   optional share-sheet text
 *   label  visible label (the accessible name follows it)
 */
export function ShareButton({
  url,
  title,
  text,
  label = "Share",
  className,
}: {
  url: string;
  title: string;
  text?: string;
  label?: string;
  className?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied", description: url, tone: "success" });
    } else {
      toast({
        title: "Could not copy the link",
        description: `Copy it by hand: ${url}`,
        tone: "error",
        duration: 8000,
      });
    }
  };

  const share = async () => {
    const data: ShareData = { title, url, ...(text ? { text } : {}) };
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const canShare =
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare(data));

    if (touch && canShare) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        // The visitor closed the share sheet: that is an answer, not an error.
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Anything else (permissions, an unsupported payload): copy instead.
      }
    }
    await copy();
  };

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xs border border-line-strong px-4",
        "font-display text-[11px] tracking-button whitespace-nowrap text-ink-100 uppercase",
        "transition-colors duration-(--duration-fast) hover:border-gold-500 hover:text-gold-300",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 shrink-0 text-signal-positive" aria-hidden="true" />
      ) : (
        <Share2 className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

/** Clipboard API first; the legacy selection-and-copy route where it is missing. */
async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Permission denied or no focus: try the fallback below.
  }
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  } catch {
    return false;
  }
}
