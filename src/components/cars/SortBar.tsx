"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";

export type SortChoice = {
  key: string;
  label: string;
  description: string;
  href: string;
};

/**
 * Sort control: "Sort by  [Most powerful ▾]" — and, from `segmentedFrom`,
 * a segmented HUD control instead: one lit plate per choice.
 *
 * The segments are plain links (each choice already has its URL), so they
 * are shareable, crawlable and work without JavaScript. Below the
 * breakpoint a native select takes over: accessible, compact, and the
 * platform picker on phones. With JavaScript a change navigates at once;
 * without it the select sits in a GET form carrying the rest of the state,
 * submitted by its button.
 */
export function SortBar({
  choices,
  active,
  hidden,
  action,
  name = "sort",
  label = "Sort by",
  segmentedFrom,
  className,
}: {
  choices: readonly SortChoice[];
  active: string;
  /** Current state minus this param and the page, for the no-JavaScript form. */
  hidden: [string, string][];
  action: string;
  /** The search param the select writes. Also used for "Per page" (pageSize). */
  name?: string;
  /** Visible label (from 640px) and the select's accessible name. */
  label?: string;
  /** Show the choices as a segmented control of links from this breakpoint. */
  segmentedFrom?: "sm" | "xl";
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const segments =
    segmentedFrom === "sm" ? "sm:flex" : segmentedFrom === "xl" ? "xl:flex" : null;
  const selectOnly =
    segmentedFrom === "sm" ? "sm:hidden" : segmentedFrom === "xl" ? "xl:hidden" : null;

  return (
    <form
      action={action}
      method="get"
      className={cn("flex min-w-0 items-center gap-3", className)}
    >
      {hidden.map(([name, value], index) => (
        <input key={`${name}-${index}`} type="hidden" name={name} value={value} />
      ))}
      <label
        htmlFor={id}
        className="hidden shrink-0 font-mono text-[11px] tracking-hud whitespace-nowrap text-ink-400 uppercase sm:block"
      >
        {label}
      </label>

      {segments ? (
        <div
          role="group"
          aria-label={label}
          className={cn(
            "hidden items-center gap-0.5 rounded-control border border-line-strong bg-surface-1/80 p-0.5",
            segments,
          )}
        >
          {choices.map((choice) => {
            const current = choice.key === active;
            return (
              <Link
                key={choice.key}
                href={choice.href}
                scroll={false}
                title={choice.description}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "relative inline-flex h-9 shrink-0 items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-3",
                  "font-mono text-[11px] tracking-hud whitespace-nowrap uppercase",
                  // 44px hit area on a 36px plate.
                  "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
                  "transition-[color,background-color,box-shadow] duration-(--duration-fast) ease-standard",
                  current
                    ? "bg-cyan-400/12 text-cyan-100 shadow-[inset_0_0_0_1px_oklch(0.83_0.13_210/50%),0_0_14px_-4px_oklch(0.8_0.14_210/60%)]"
                    : "text-ink-300 hover:bg-surface-2 hover:text-ink-50",
                )}
              >
                {choice.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className={cn("relative min-w-0", selectOnly)}>
        <select
          id={id}
          name={name}
          value={active}
          aria-busy={pending || undefined}
          // The visible label is hidden on phones; the name must not be.
          aria-label={label}
          onChange={(event) => {
            const next = choices.find((choice) => choice.key === event.target.value);
            if (next) startTransition(() => router.push(next.href, { scroll: false }));
          }}
          className={cn(
            "h-11 w-full max-w-60 min-w-0 appearance-none rounded-control border border-line-strong bg-surface-1 pr-10 pl-3.5",
            "font-mono text-xs tracking-hud text-ink-50 uppercase transition-colors duration-(--duration-fast)",
            "hover:border-cyan-700 focus-visible:border-cyan-300",
            pending && "opacity-70",
          )}
        >
          {choices.map((choice) => (
            <option key={choice.key} value={choice.key}>
              {choice.description}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-cyan-300"
          aria-hidden="true"
        />
      </div>
      <noscript>
        <button type="submit" className={buttonClasses("secondary", "sm")}>
          Apply
        </button>
      </noscript>
    </form>
  );
}
