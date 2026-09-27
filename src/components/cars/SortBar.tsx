"use client";

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
 * Sort control: "Sort by  [Most powerful ▾]".
 *
 * A native select — accessible, compact, and the platform picker on phones.
 * With JavaScript a change navigates at once; without it the select sits in
 * a GET form carrying the rest of the state, submitted by its button.
 */
export function SortBar({
  choices,
  active,
  hidden,
  action,
  name = "sort",
  label = "Sort by",
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
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();

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
        className="hidden shrink-0 text-body-s whitespace-nowrap text-ink-400 sm:block"
      >
        {label}
      </label>
      <div className="relative min-w-0">
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
            "text-body-s text-ink-50 transition-colors duration-(--duration-fast) hover:border-ink-500 focus-visible:border-gold-500",
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
        <button type="submit" className={buttonClasses("secondary", "sm")}>
          Apply
        </button>
      </noscript>
    </form>
  );
}
