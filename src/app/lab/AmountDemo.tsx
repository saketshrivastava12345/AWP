"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AutoScaleNumberInput } from "@/components/inputs/AutoScaleNumberInput";
import { formatRaw } from "@/components/inputs/number-format";

type Market = "INR" | "USD" | "EUR";

const MARKETS: Record<Market, { locale: string; label: string; example: string }> = {
  INR: { locale: "en-IN", label: "INR · en-IN", example: "12,50,000" },
  USD: { locale: "en-US", label: "USD · en-US", example: "1,250,000" },
  EUR: { locale: "de-DE", label: "EUR · de-DE", example: "1.250.000" },
};

const OPTIONS = (Object.keys(MARKETS) as Market[]).map((key) => ({
  value: key,
  label: MARKETS[key].label,
}));

/**
 * The auto-scaling amount input with a market switch, and a readout of the
 * raw value the form would submit. Demo only: nothing here is a price.
 */
export function AmountDemo() {
  const [market, setMarket] = useState<Market>("INR");
  const [raw, setRaw] = useState("");
  const { locale, example } = MARKETS[market];

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        label="Currency and locale"
        options={OPTIONS}
        value={market}
        onChange={setMarket}
        size="sm"
        wrap
      />
      <form
        onSubmit={(event) => event.preventDefault()}
        aria-label="Amount demo"
        className="flex flex-col gap-4"
      >
        <AutoScaleNumberInput
          label="Amount"
          name="amount"
          value={raw}
          onValueChange={setRaw}
          currency={market}
          locale={locale}
          decimals={2}
          description={`Type up to twelve digits: the figure shrinks to fit the box instead of overflowing. Grouping follows the locale (${example}).`}
        />
      </form>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-hud">Shown as</dt>
        <dd className="font-mono text-ink-100 tabular-nums">
          {raw ? formatRaw(raw, locale) : <span className="text-ink-500">—</span>}
        </dd>
        <dt className="text-hud">Submitted as</dt>
        <dd className="font-mono text-cyan-200 tabular-nums">
          amount=
          {raw || <span className="text-ink-500">(empty)</span>}
        </dd>
      </dl>
    </div>
  );
}
