"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortChoice = {
  key: string;
  label: string;
  description: string;
  href: string;
};

/**
 * Sort control.
 *
 * On wide screens a segmented row of links (one click, crawlable, works
 * without JavaScript). Below that, a native select: accessible, compact, and
 * the platform picker on phones. The select sits in a GET form carrying the
 * rest of the state, so it also works without JavaScript via its button.
 */
export function SortBar({
  choices,
  active,
  hidden,
  action,
  className,
}: {
  choices: readonly SortChoice[];
  active: string;
  /** Current state minus sort and page, for the no-JavaScript form. */
  hidden: [string, string][];
  action: string;
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      <nav aria-label="Sort cars" className="hidden items-center gap-3 xl:flex">
        <span className="text-label">Sort</span>
        <ul className="flex gap-px overflow-hidden rounded-sm border border-line bg-line">
          {choices.map((choice) => {
            const current = choice.key === active;
            return (
              <li key={choice.key}>
                <Link
                  href={choice.href}
                  scroll={false}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "flex h-9 items-center px-3 font-display text-micro tracking-hud whitespace-nowrap uppercase",
                    "transition-colors duration-(--duration-fast)",
                    current
                      ? "bg-surface-3 text-gold-300 shadow-[inset_0_-1px_0_0_var(--color-gold-500)]"
                      : "bg-surface-1 text-ink-300 hover:bg-surface-2 hover:text-ink-50",
                  )}
                >
                  {choice.label}
                  {choice.description !== choice.label ? (
                    <span className="sr-only">, {choice.description.toLowerCase()}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form
        action={action}
        method="get"
        className="flex min-w-0 items-center gap-2 xl:hidden"
      >
        {hidden.map(([name, value], index) => (
          <input key={`${name}-${index}`} type="hidden" name={name} value={value} />
        ))}
        <label htmlFor={id} className="sr-only">
          Sort cars
        </label>
        <div className="relative w-full max-w-60 min-w-0">
          <select
            id={id}
            name="sort"
            value={active}
            aria-busy={pending || undefined}
            onChange={(event) => {
              const next = choices.find((choice) => choice.key === event.target.value);
              if (next) startTransition(() => router.push(next.href, { scroll: false }));
            }}
            className={cn(
              "h-11 w-full min-w-0 appearance-none rounded-xs border border-line-strong bg-surface-1 pr-9 pl-3",
              "text-sm text-ink-100 transition-colors hover:border-ink-500 focus-visible:border-gold-500",
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
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        </div>
        <noscript>
          <button
            type="submit"
            className="h-11 rounded-xs border border-line-strong px-3 font-display text-micro tracking-button text-ink-200 uppercase"
          >
            Sort
          </button>
        </noscript>
      </form>
    </div>
  );
}
