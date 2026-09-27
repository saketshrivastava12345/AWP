import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CircleCheck, TriangleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { AdminPageHeader, Panel } from "@/components/admin/AdminChrome";
import { adminPage } from "@/lib/admin/page";
import { getDashboard, type DashboardData } from "@/lib/queries/admin";
import { STALE_AFTER_DAYS } from "@/lib/pricing/engine";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: { absolute: "Dashboard · Admin — AURIX" } };

const n = (value: number | null) => (value === null ? "—" : formatNumber(value, "—"));

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
  const body = (
    <>
      <dt className="font-display text-micro tracking-[0.1em] text-ink-400 uppercase sm:tracking-label">
        {label}
      </dt>
      <dd className="tabular mt-3 font-display text-2xl leading-none text-ink-50">
        {value}
      </dd>
      {detail ? <dd className="mt-2 text-xs text-ink-500">{detail}</dd> : null}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="group edge-light block bg-surface-1 px-4 py-4 transition-colors hover:bg-surface-2 sm:px-5"
    >
      <dl>{body}</dl>
    </Link>
  ) : (
    <div className="edge-light bg-surface-1 px-4 py-4 sm:px-5">
      <dl>{body}</dl>
    </div>
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
        className="group flex items-start gap-3 border-b border-line-subtle px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-5"
      >
        {clear ? (
          <CircleCheck
            className="mt-0.5 size-4 shrink-0 text-signal-positive"
            aria-hidden="true"
          />
        ) : (
          <TriangleAlert
            className={cn(
              "mt-0.5 size-4 shrink-0",
              unknown ? "text-ink-500" : "text-gold-400",
            )}
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-100">{label}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
            {explanation}
          </span>
        </span>
        <span
          className={cn(
            "tabular font-mono text-sm",
            clear ? "text-signal-positive" : unknown ? "text-ink-500" : "text-gold-300",
          )}
        >
          {unknown ? "—" : formatNumber(count)}
        </span>
        <ArrowUpRight
          className="mt-0.5 size-3.5 shrink-0 text-ink-600 transition-colors group-hover:text-gold-300"
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
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
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
    </dl>
  );
}

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
          className="mb-6 rounded-sm border border-signal-negative/40 px-4 py-3 text-sm text-ink-200"
        >
          {failures} figure{failures === 1 ? "" : "s"} could not be read from the database
          and {failures === 1 ? "is" : "are"} shown as “—”. Nothing is assumed to be zero.
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

      <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <Panel
          id="quality"
          title="Data quality"
          description="Each line opens the list that needs attention."
          bodyClassName="p-0 sm:p-0"
        >
          <ul>
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
          </ul>
        </Panel>

        <Panel id="recent" title="Recent edits" bodyClassName="p-0 sm:p-0">
          {data.recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">No edits recorded yet.</p>
          ) : (
            <ol>
              {data.recent.map((edit) => (
                <li key={`${edit.kind}-${edit.id}`}>
                  <Link
                    href={edit.href}
                    className="flex items-baseline justify-between gap-4 border-b border-line-subtle px-4 py-3 transition-colors hover:bg-surface-2/60 sm:px-5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink-100">
                        {edit.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {edit.detail}
                      </span>
                    </span>
                    <time
                      dateTime={edit.at}
                      className="shrink-0 font-mono text-xs text-ink-400"
                    >
                      {formatDate(edit.at)}
                    </time>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
