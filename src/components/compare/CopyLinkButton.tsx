"use client";

import { Link2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { buttonClasses } from "@/components/ui/Button";

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
      className={buttonClasses("secondary", "sm", className)}
    >
      <Link2 aria-hidden="true" />
      Copy link
    </button>
  );
}
