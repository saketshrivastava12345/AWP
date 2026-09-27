"use client";

import { Link2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

/**
 * Copies the comparison's address. The URL is the whole state — cars, order
 * and the differences-only choice — so the link opens exactly this view.
 */
export function CopyLinkButton({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const toast = useToast();

  async function copy() {
    const url = new URL(href, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Anyone who opens it sees this comparison.",
        tone: "success",
      });
    } catch {
      // No clipboard access (an insecure origin, or permission refused):
      // show the address so it can be copied by hand.
      toast({
        title: "Could not copy automatically",
        description: url,
        tone: "error",
        duration: 0,
      });
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xs border border-line-strong px-4",
        "font-display text-micro tracking-button text-ink-100 uppercase transition-colors duration-(--duration-fast)",
        "hover:border-gold-500 hover:text-gold-300",
        className,
      )}
    >
      <Link2 className="size-3.5" aria-hidden="true" />
      Copy link
    </button>
  );
}
