import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small photograph for admin tables. Unoptimised on purpose: the admin
 * needs to see the stored file as it is, and it must work for local paths and
 * Storage URLs alike. Decorative (the row names the vehicle).
 */
export function VehicleThumb({
  url,
  missing = false,
  className,
  size = "sm",
}: {
  url: string | null;
  /** The record points at a local file that does not exist. */
  missing?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? { width: 64, height: 40 } : { width: 160, height: 100 };
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xs border border-line-subtle bg-surface-2",
        size === "sm" ? "h-10 w-16" : "h-[100px] w-40",
        className,
      )}
    >
      {missing ? (
        <span className="flex flex-col items-center gap-0.5 text-signal-negative">
          <ImageOff className="size-4" aria-hidden="true" />
          <span className="font-mono text-[8px] tracking-wide uppercase">Missing</span>
        </span>
      ) : url ? (
        <Image
          src={url}
          alt=""
          width={dims.width}
          height={dims.height}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        <ImageOff className="size-4 text-ink-600" aria-hidden="true" />
      )}
    </span>
  );
}
