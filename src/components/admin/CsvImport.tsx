"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { CircleAlert, CircleCheck, Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import {
  commitPriceCsv,
  previewPriceCsv,
  type CsvState,
} from "@/lib/admin/actions/prices";
import { IDLE_STATE } from "@/lib/admin/action-state";
import { MAX_CSV_ROWS, priceCsvTemplate } from "@/lib/admin/csv";
import { PRICE_TYPE_ADMIN_LABELS } from "@/lib/admin/labels";
import type { PriceType } from "@/types/domain";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TableFrame, TD, TD_NUM, TH } from "./AdminChrome";

const INITIAL: CsvState = {
  ...IDLE_STATE,
  csv: "",
  headerErrors: [],
  rows: [],
  validCount: 0,
  committed: null,
};

/** Form encoding turns LF into CRLF; compare texts regardless of line endings. */
const sameText = (a: string, b: string) =>
  a.replace(/\r\n?/g, "\n") === b.replace(/\r\n?/g, "\n");

const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(priceCsvTemplate())}`;

/**
 * Import prices from a CSV: check the file (nothing is saved), review every
 * row with its errors, then import the valid rows in one step. The server
 * re-validates on import; the preview is only a preview.
 */
export function CsvImport() {
  const [preview, previewAction, previewing] = useActionState(previewPriceCsv, INITIAL);
  const [result, commitAction, committing] = useActionState(commitPriceCsv, INITIAL);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const push = useToast();
  const announced = useRef(0);

  // The latest outcome of either step decides what is shown.
  const showResult = result.at > preview.at;

  useEffect(() => {
    const latest = result.at > preview.at ? result : preview;
    if (latest.at === 0 || latest.at === announced.current || !latest.message) return;
    announced.current = latest.at;
    push({
      title: latest.message,
      tone: latest.status === "success" ? "success" : "error",
    });
  }, [preview, result, push]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
    // The text area is now the single source of what is checked and imported.
    input.value = "";
  };

  const onPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData();
    data.set("csv", text);
    startTransition(() => previewAction(data));
  };

  const onCommit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData();
    data.set("csv", preview.csv);
    startTransition(() => {
      commitAction(data);
    });
  };

  const canCommit = !showResult && preview.validCount > 0 && sameText(preview.csv, text);

  return (
    <div className="flex flex-col gap-8">
      <form
        action={previewAction}
        onSubmit={onPreview}
        className="flex flex-col gap-4"
        aria-label="Check a CSV file"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={buttonClasses(
              "secondary",
              "md",
              "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-500",
            )}
          >
            Choose CSV file
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="sr-only"
            />
          </label>
          <span className="text-xs text-ink-500">
            {fileName ? `Loaded ${fileName}` : "or paste the rows below"}
          </span>
          <a
            href={TEMPLATE_HREF}
            download="aurix-prices-template.csv"
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-50 underline-offset-4 hover:underline"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download the template (header row only)
          </a>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-caption">CSV contents</span>
          <Textarea
            name="csv"
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            rows={8}
            spellCheck={false}
            className="font-mono text-xs"
            placeholder="variant,market,price_type,currency,ex_showroom_price,…"
          />
        </label>
        <div>
          <Button type="submit" variant="secondary" loading={previewing}>
            Check rows
          </Button>
          <span className="ml-3 text-xs text-ink-500">
            Nothing is saved until you import. At most {MAX_CSV_ROWS} rows.
          </span>
        </div>
      </form>

      {!showResult && preview.status !== "idle" ? (
        <section aria-labelledby="csv-preview" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="csv-preview" className="text-h4">
              Preview
            </h2>
            <p
              className={cn(
                "text-sm",
                preview.status === "success" ? "text-ink-200" : "text-signal-negative",
              )}
            >
              {preview.message}
            </p>
          </div>
          {preview.headerErrors.length ? (
            <ul className="list-inside list-disc rounded-card border-l-2 border-signal-negative bg-surface-1 px-4 py-3 text-sm text-ink-200">
              {preview.headerErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
          {preview.rows.length ? (
            <TableFrame label="CSV rows">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>
                      Line
                    </th>
                    <th scope="col" className={TH}>
                      Vehicle
                    </th>
                    <th scope="col" className={TH}>
                      Market
                    </th>
                    <th scope="col" className={TH}>
                      Type
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Listed
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      On-road
                    </th>
                    <th scope="col" className={TH}>
                      From
                    </th>
                    <th scope="col" className={TH}>
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => {
                    const ok = row.errors.length === 0;
                    return (
                      <tr
                        key={row.line}
                        className={ok ? undefined : "bg-signal-negative/[0.04]"}
                      >
                        <td className={`${TD} font-mono text-xs`}>{row.line}</td>
                        <td className={`${TD} text-xs`}>
                          <span className="block text-ink-100">
                            {row.variantLabel ?? "—"}
                          </span>
                          <span className="font-mono text-ink-500">
                            {row.variantPath}
                          </span>
                        </td>
                        <td className={`${TD} text-xs`}>
                          <span className="block text-ink-100">
                            {row.marketLabel ?? "—"}
                          </span>
                          <span className="font-mono text-ink-500">{row.marketPath}</span>
                        </td>
                        <td className={`${TD} text-xs`}>
                          {row.priceType
                            ? PRICE_TYPE_ADMIN_LABELS[row.priceType as PriceType]
                            : "—"}
                        </td>
                        <td className={TD_NUM}>
                          {formatPrice(row.exShowroom, row.currency, "—")}
                        </td>
                        <td className={TD_NUM}>
                          {formatPrice(row.onRoad, row.currency, "—")}
                        </td>
                        <td className={`${TD} font-mono text-xs`}>
                          {row.effectiveFrom ?? "—"}
                        </td>
                        <td className={`${TD} text-xs`}>
                          {ok ? (
                            <Badge tone="positive">Ready</Badge>
                          ) : (
                            <ul className="flex flex-col gap-1 text-signal-negative">
                              {row.errors.map((message) => (
                                <li key={message} className="flex gap-1.5">
                                  <CircleAlert
                                    className="mt-0.5 size-3 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableFrame>
          ) : null}
          <form
            action={commitAction}
            onSubmit={onCommit}
            className="flex flex-wrap items-center gap-3"
          >
            <input type="hidden" name="csv" value={preview.csv} />
            <Button type="submit" disabled={!canCommit} loading={committing}>
              Import {preview.validCount} valid row{preview.validCount === 1 ? "" : "s"}
            </Button>
            {!sameText(preview.csv, text) ? (
              <span className="text-xs text-signal-hybrid">
                The text changed since it was checked. Check it again first.
              </span>
            ) : preview.validCount < preview.rows.length ? (
              <span className="text-xs text-ink-500">
                Rows with errors are skipped and reported.
              </span>
            ) : null}
          </form>
        </section>
      ) : null}

      {showResult && result.status !== "idle" ? (
        <section
          aria-labelledby="csv-result"
          className="flex flex-col gap-3 rounded-card border border-line-subtle bg-surface-1 p-5"
        >
          <h2 id="csv-result" className="flex items-center gap-2 text-h4">
            {result.status === "success" ? (
              <CircleCheck className="size-4 text-signal-positive" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-4 text-signal-negative" aria-hidden="true" />
            )}
            Import result
          </h2>
          <p className="text-sm text-ink-200">{result.message}</p>
          {result.committed?.failed.length ? (
            <ul className="flex flex-col gap-1 text-xs text-ink-300">
              {result.committed.failed.map((failure) => (
                <li key={`${failure.line}-${failure.message}`}>
                  <span className="text-ink-500 tabular-nums">Line {failure.line}:</span>{" "}
                  {failure.message}
                </li>
              ))}
            </ul>
          ) : null}
          {result.rows.length ? (
            <p className="text-xs text-ink-500">
              The rows were re-checked on the server and none were valid.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
