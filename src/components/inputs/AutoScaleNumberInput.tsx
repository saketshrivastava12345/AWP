"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  currencyAffixes,
  formatRaw,
  localeSeparators,
  mapCaret,
  sanitizeRaw,
} from "./number-format";
import { fontShorthand, letterSpacingPx, measureTextWidth } from "./text-measure";

export type AutoScaleNumberInputProps = {
  label: ReactNode;
  /** The raw numeric string ("1250000", "1250.5"); controlled when given. */
  value?: string;
  /** Initial raw value when uncontrolled. */
  defaultValue?: string;
  /** Called with the raw numeric string on every edit. */
  onValueChange?: (raw: string) => void;
  /** ISO 4217 code: draws the locale's symbol before or after the digits. */
  currency?: string;
  /** BCP 47 tag for grouping and the decimal separator; defaults from the currency. */
  locale?: string;
  /** The form field name; the raw value is submitted under it. */
  name?: string;
  id?: string;
  placeholder?: string;
  /** Maximum integer digits (numeric(14,2) → 12). */
  maxDigits?: number;
  /** Maximum fraction digits; 0 refuses the decimal point. */
  decimals?: number;
  maxFontSize?: number;
  minFontSize?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** A sentence under the control (the hint). */
  description?: ReactNode;
  /** A validation message under the control; sets aria-invalid. */
  error?: string | null;
  autoFocus?: boolean;
};

/** A sensible locale for a currency when the caller does not say. */
export function defaultLocaleFor(currency: string | undefined): string {
  switch (currency?.toUpperCase()) {
    case "INR":
      return "en-IN";
    case "EUR":
      return "de-DE";
    case "GBP":
      return "en-GB";
    case "JPY":
      return "ja-JP";
    default:
      return "en-US";
  }
}

/** Gap between the currency symbol and the digits, in em, so it scales. */
const AFFIX_GAP_EM = 0.18;

const subscribeNever = () => () => {};

/**
 * A large amount entry (the Uniswap / Wise pattern). The figure is typed
 * at up to `maxFontSize` and shrinks smoothly, never below `minFontSize`,
 * as it grows, so a twelve-digit amount fits the box instead of overflowing
 * or clipping. Digits are grouped live the locale's way (en-IN: 12,50,000),
 * the currency symbol sits where the locale puts it, and the caret stays
 * with the digit it was on while the grouping shifts underneath.
 *
 * What the form receives is the raw number — "1250000", never "12,50,000"
 * — through a hidden input named `name`. Without JavaScript the visible
 * control is replaced by a plain text input of the same name, so the value
 * is still submitted; the server's own parser handles it.
 *
 * Reduced motion turns off the font-size transition; everything else is
 * the same.
 */
export function AutoScaleNumberInput({
  label,
  value,
  defaultValue = "",
  onValueChange,
  currency,
  locale: localeProp,
  name,
  id: idProp,
  placeholder = "0",
  maxDigits = 12,
  decimals = 0,
  maxFontSize = 64,
  minFontSize = 24,
  required = false,
  disabled = false,
  className,
  description,
  error,
  autoFocus,
}: AutoScaleNumberInputProps) {
  const generatedId = useId();
  const id = idProp ?? `${generatedId}amount`;
  const locale = localeProp ?? defaultLocaleFor(currency);
  const { group, decimal } = localeSeparators(locale);
  const { prefix, suffix } = currencyAffixes(currency, locale);

  const [internal, setInternal] = useState(() =>
    sanitizeRaw(defaultValue, { decimal: ".", maxDigits, decimals }),
  );
  const raw = value ?? internal;
  const display = formatRaw(raw, locale);

  // The hidden input exists only once React runs: without JavaScript the
  // <noscript> input is the field, and two inputs of one name would submit
  // twice.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const prefixRef = useRef<HTMLSpanElement>(null);
  const suffixRef = useRef<HTMLSpanElement>(null);

  const commit = (nextRaw: string) => {
    if (value === undefined) setInternal(nextRaw);
    onValueChange?.(nextRaw);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const typed = input.value;
    const caret = input.selectionStart ?? typed.length;
    const nextRaw = sanitizeRaw(typed, { decimal, maxDigits, decimals });
    const nextDisplay = formatRaw(nextRaw, locale);
    const nextCaret = mapCaret(typed, caret, nextDisplay, decimal, decimals);
    // Write the reformatted text back synchronously: React then finds the
    // DOM already matching its value and leaves the caret where we put it.
    input.value = nextDisplay;
    input.setSelectionRange(nextCaret, nextCaret);
    if (nextRaw !== raw) commit(nextRaw);
  };

  // Backspace over a group separator deletes the digit before it, and
  // Delete over one removes the digit after it, instead of doing nothing.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!group) return;
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start === null || end === null || start !== end) return;
    if (event.key === "Backspace" && input.value.charAt(start - 1) === group) {
      input.setSelectionRange(start - 1, start - 1);
    } else if (event.key === "Delete" && input.value.charAt(start) === group) {
      input.setSelectionRange(start + 1, start + 1);
    }
  };

  // Fit: measure the affixes and the text (or the placeholder) at the
  // largest size and scale the row's font-size down until it fits. The
  // measurement is from a canvas, not the DOM, so nothing loops.
  const fit = useCallback(() => {
    const row = rowRef.current;
    const input = inputRef.current;
    if (!row || !input) return;
    const available = row.clientWidth;
    if (available <= 0) return;
    const style = getComputedStyle(input);
    const font = fontShorthand(style, maxFontSize);
    const currentSize = parseFloat(style.fontSize) || maxFontSize;
    const spacing = (letterSpacingPx(style) / currentSize) * maxFontSize;
    const text = display || placeholder;
    let needed = measureTextWidth(text, font, spacing);
    // The symbols sit in their own (text) font: Michroma has no rupee or
    // euro glyph, so they are measured with the span's real font.
    const affixes: [HTMLSpanElement | null, string][] = [
      [prefixRef.current, prefix],
      [suffixRef.current, suffix],
    ];
    for (const [affix, text] of affixes) {
      if (!affix || !text) continue;
      const affixFont = fontShorthand(getComputedStyle(affix), maxFontSize);
      needed += measureTextWidth(text, affixFont) + AFFIX_GAP_EM * maxFontSize;
    }
    const scale = needed > 0 ? Math.min(1, available / needed) : 1;
    const size = Math.max(minFontSize, Math.floor(maxFontSize * scale * 100) / 100);
    row.style.fontSize = `${size}px`;
  }, [display, placeholder, prefix, suffix, maxFontSize, minFontSize]);

  useLayoutEffect(() => {
    fit();
  }, [fit]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(row);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fit]);

  const describedBy =
    [description ? `${id}-description` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const affixClasses =
    "shrink-0 font-sans font-medium whitespace-pre text-[length:inherit] text-cyan-300 [html:not(.js)_&]:text-[28px]";

  return (
    <div className={cn("group/amount flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="text-label">
        {label}
        {required ? (
          <span className="ml-1 text-ink-500" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div
        className={cn(
          "relative rounded-card px-5 py-4 transition-[box-shadow,border-color] duration-(--duration-base) hud-panel",
          "focus-within:border-cyan-300 focus-within:shadow-glow-cyan",
          error && "border-signal-negative",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-text",
        )}
        onPointerDown={(event) => {
          // Clicking the symbol or the empty space focuses the digits.
          if (disabled || event.target === inputRef.current) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <span
          aria-hidden="true"
          className="hud-brackets -m-px opacity-0 transition-opacity duration-(--duration-base) [--hud-l:14px] group-focus-within/amount:opacity-100"
        />
        <div
          ref={rowRef}
          className={cn(
            "flex min-w-0 items-baseline font-hud leading-none tracking-[-0.02em] tabular-nums",
            "transition-[font-size] duration-200 ease-(--ease-standard) motion-reduce:transition-none",
          )}
          style={{ fontSize: `${maxFontSize}px`, gap: `${AFFIX_GAP_EM}em` }}
        >
          {prefix ? (
            <span ref={prefixRef} aria-hidden="true" className={affixClasses}>
              {prefix}
            </span>
          ) : null}
          <noscript>
            <input
              id={id}
              name={name}
              type="text"
              inputMode="decimal"
              defaultValue={raw}
              placeholder={placeholder}
              required={required}
              disabled={disabled}
              autoComplete="off"
              aria-describedby={describedBy}
              className="min-w-0 flex-1 bg-transparent text-[28px] text-ink-50 outline-none placeholder:text-ink-600"
            />
          </noscript>
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={display}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "min-w-0 flex-1 bg-transparent p-0 text-[length:inherit] text-ink-50 caret-cyan-300 outline-none",
              "placeholder:text-ink-600 disabled:cursor-not-allowed",
              "[html:not(.js)_&]:hidden",
            )}
          />
          {suffix ? (
            <span ref={suffixRef} aria-hidden="true" className={affixClasses}>
              {suffix}
            </span>
          ) : null}
        </div>
        {hydrated && name ? (
          <input type="hidden" name={name} value={raw} disabled={disabled} />
        ) : null}
      </div>

      {description ? (
        <p id={`${id}-description`} className="text-caption">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-signal-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
