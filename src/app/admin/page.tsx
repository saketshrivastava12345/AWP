import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CircleCheck, TriangleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { CountUp, Reveal } from "@/components/fx";
import { AdminPageHeader, Panel } from "@/components/admin/AdminChrome";
import { adminPage } from "@/lib/admin/page";
import { getDashboard, type DashboardData } from "@/lib/queries/admin";
import { STALE_AFTER_DAYS } from "@/lib/pricing/engine";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: { absolute: "Dashboard · Admin — AURIX" } };

const n = (value: number | null) => (value === null ? "—" : formatNumber(value, "—"));

/**
 * One telemetry tile: a lit tick, a glowing Michroma figure that counts up
 * to the real number (the server HTML holds the real number; a figure the
 * database could not give stays an unlit "—"), a mono label and a detail.
 */
function Stat({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  href?: string;
}) {
  const known = value !== "—";
  const body = (
    <dl className="flex h-full flex-col">
      <dt className="flex items-center gap-2 text-hud">
        <span
          aria-hidden="true"
          className={cn(
            "h-0.5 w-5 shrink-0",
            known ? "bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]" : "bg-ink-600",
          )}
        />
        {label}
      </dt>
      <dd
        className={cn(
          "mt-3 text-figure",
          known ? "text-ink-50 glow-text" : "text-ink-400",
        )}
      >
        {known ? <CountUp value={value} /> : value}
      </dd>
      {detail ? (
        <dd className="mt-2 font-mono text-[11px] text-ink-400">{detail}</dd>
      ) : null}
    </dl>
  );
  const tile =
    "relative block h-full bg-surface-1/85 px-4 py-4 transition-colors duration-(--duration-fast) sm:px-5";
  return href ? (
    <Link
      href={href}
      className={cn(
        tile,
        "group hover:bg-cyan-400/6 focus-visible:outline-offset-[-2px]",
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-cyan-300 after:opacity-0 after:transition-opacity after:duration-(--duration-fast) after:content-[''] hover:after:opacity-100",
      )}
    >
      {body}
      <ArrowUpRight
        className="absolute top-4 right-4 size-3.5 text-ink-500 transition-colors group-hover:text-cyan-200"
        aria-hidden="true"
      />
    </Link>
  ) : (
    <div className={tile}>{body}</div>
  );
}

function QualityRow({
  label,
  count,
  href,
  explanation,
}: {
  label: string;
  count: number | null;
  href: string;
  explanation: string;
}) {
  const clear = count === 0;
  const unknown = count === null;
  return (
    <li>
      <Link
        href={href}
        className="group flex items-start gap-3 border-b border-line-subtle px-4 py-3.5 transition-colors duration-(--duration-fast) hover:bg-cyan-400/5 sm:px-5"
      >
        {clear ? (
          <CircleCheck
            className="mt-0.5 size-4 shrink-0 text-signal-positive drop-shadow-[0_0_6px_var(--color-signal-positive)]"
            aria-hidden="true"
          />
        ) : (
          <TriangleAlert
            className={cn(
              "mt-0.5 size-4 shrink-0",
              unknown
                ? "text-ink-500"
                : "text-signal-hybrid drop-shadow-[0_0_6px_var(--color-signal-hybrid)]",
            )}
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-100 transition-colors duration-(--duration-fast) group-hover:text-ink-50">
            {label}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
            {explanation}
          </span>
        </span>
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            clear
              ? "text-signal-positive"
              : unknown
                ? "text-ink-500"
                : "text-ink-50 [text-shadow:0_0_12px_oklch(0.83_0.13_210/40%)]",
          )}
        >
          {unknown ? "—" : formatNumber(count)}
        </span>
        <ArrowUpRight
          className="mt-0.5 size-3.5 shrink-0 text-ink-500 transition-[color,translate] duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-cyan-200 motion-reduce:translate-x-0"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

function Counts({ counts }: { counts: DashboardData["counts"] }) {
  const vehicles =
    counts.variantsPublished === null || counts.variantsDraft === null
      ? null
      : counts.variantsPublished + counts.variantsDraft;
  return (
    <Reveal
      stagger={60}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line-subtle lg:grid-cols-4"
    >
      <Stat
        label="Vehicles"
        value={n(vehicles)}
        detail={`${n(counts.variantsPublished)} published · ${n(counts.variantsDraft)} drafts`}
        href="/admin/vehicles"
      />
      <Stat label="Manufacturers" value={n(counts.manufacturers)} />
      <Stat
        label="Models"
        value={n(counts.models)}
        detail={`${n(counts.generations)} generations`}
        href="/admin/models"
      />
      <Stat label="Photographs" value={n(counts.images)} href="/admin/media" />
      <Stat label="3D models" value={n(counts.models3d)} href="/admin/media" />
      <Stat
        label="Current prices"
        value={n(counts.currentPrices)}
        detail={`${n(counts.priceRows)} price rows incl. history`}
        href="/admin/prices"
      />
      <Stat
        label="Markets"
        value={n(counts.regions)}
        detail={`states · ${n(counts.cities)} cities`}
        href="/admin/markets"
      />
      <Stat
        label="Users"
        value={n(counts.users)}
        detail={`${n(counts.admins)} with the admin role`}
      />
    </Reveal>
  );
}

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function AdminDashboardPage() {
  const { supabase, user } = await adminPage();
  const data = await getDashboard(supabase);
  const { quality } = data;
  const failures = [...Object.values(data.counts), ...Object.values(quality)].filter(
    (value) => value === null,
  ).length;

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        eyebrow={
          <p className="flex items-center gap-2 text-hud">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 animate-pulse-glow rounded-full bg-signal-positive shadow-[0_0_8px_var(--color-signal-positive)]"
            />
            Catalogue telemetry · live
          </p>
        }
        description={`Signed in as ${user.displayName ?? user.email ?? "administrator"}. Every change here is checked against your admin role twice: by these tools and by the database's row level security.`}
        actions={
          <>
            <ButtonLink href="/admin/prices/import" variant="secondary" size="sm">
              Import prices
            </ButtonLink>
            <ButtonLink href="/admin/vehicles/new" size="sm">
              New vehicle
            </ButtonLink>
          </>
        }
      />

      {failures > 0 ? (
        <p
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-card border border-signal-negative/40 bg-surface-1/80 px-4 py-3 text-sm text-ink-200 before:mt-[7px] before:size-1.5 before:shrink-0 before:rounded-full before:bg-signal-negative before:shadow-[0_0_8px_var(--color-signal-negative)] before:content-['']"
        >
          <span>
            {failures} figure{failures === 1 ? "" : "s"} could not be read from the
            database and {failures === 1 ? "is" : "are"} shown as “—”. Nothing is assumed
            to be zero.
          </span>
        </p>
      ) : null}

      <section aria-labelledby="counts-heading">
        <h2 id="counts-heading" className="sr-only">
          Catalogue counts
        </h2>
        <Counts counts={data.counts} />
        <p className="mt-3 text-xs text-ink-500">
          Saved cars are private to each user (row level security), so no favourites count
          is shown.
        </p>
      </section>

      <Reveal
        stagger={120}
        className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] [&>*]:min-w-0"
      >
        <Panel
          id="quality"
          code="QA // 01"
          title="Data quality"
          description="Each line opens the list that needs attention."
          bodyClassName="p-0 sm:p-0"
        >
          <Reveal as="ul" stagger={50} variant="fade">
            <QualityRow
              label="Vehicles with unsourced figures"
              count={quality.unsourcedVehicles}
              href="/admin/vehicles?quality=unsourced"
              explanation="A spec section has figures but names no source."
            />
            <QualityRow
              label="Spec records never verified"
              count={quality.unverifiedSpecRows}
              href="/admin/sources"
              explanation="Performance, dimensions, fuel, EV, engine and transmission records without a verification date."
            />
            <QualityRow
              label="Prices not marked verified"
              count={quality.unverifiedPrices}
              href="/admin/prices?filter=unverified"
              explanation="In-force prices an editor has not confirmed against the source."
            />
            <QualityRow
              label={`Prices checked over ${STALE_AFTER_DAYS} days ago`}
              count={quality.stalePrices}
              href="/admin/prices?filter=stale"
              explanation="The public site flags these as possibly out of date."
            />
            <QualityRow
              label="Vehicles without a photograph"
              count={quality.vehiclesWithoutPhoto}
              href="/admin/vehicles?quality=no-photo"
              explanation="Neither the vehicle nor its model has an image; the public card shows a silhouette."
            />
            <QualityRow
              label="Photographs whose file is missing"
              count={quality.missingImageFiles}
              href="/admin/media"
              explanation="The record points at a file under /public that is not in the repository."
            />
            <QualityRow
              label="Combustion models without engine position"
              count={quality.modelsWithoutEnginePosition}
              href="/admin/models?filter=no-engine-position"
              explanation="The 3D viewer draws no engine rather than guessing where it sits."
            />
          </Reveal>
        </Panel>

        <Panel
          id="recent"
          code="LOG // 02"
          title="Recent edits"
          bodyClassName="p-0 sm:p-0"
        >
          {data.recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">No edits recorded yet.</p>
          ) : (
            <Reveal as="ol" stagger={50} variant="fade">
              {data.recent.map((edit) => (
                <li key={`${edit.kind}-${edit.id}`}>
                  <Link
                    href={edit.href}
                    className="group flex items-baseline justify-between gap-4 border-b border-line-subtle px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-cyan-400/5 sm:px-5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink-100 transition-colors duration-(--duration-fast) group-hover:text-ink-50">
                        {edit.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {edit.detail}
                      </span>
                    </span>
                    <time
                      dateTime={edit.at}
                      className="shrink-0 font-mono text-[11px] text-ink-400 tabular-nums"
                    >
                      {formatDate(edit.at)}
                    </time>
                  </Link>
                </li>
              ))}
            </Reveal>
          )}
        </Panel>
      </Reveal>
    </>
  );
}
