import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getSessionUser } from "@/lib/queries/auth";
import { getTableCounts, getRecentVariants } from "@/lib/queries/admin";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin",
  description: "Catalogue administration.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getSessionUser();

  // Not signed in, or signed in without the admin role: the same response
  // either way, so this page cannot be used to probe who is an admin.
  if (user?.role !== "admin") {
    return (
      <Container className="py-16">
        <p className="text-label">Restricted</p>
        <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          ADMIN
        </h1>
        <EmptyState
          className="mt-14"
          icon={<ShieldAlert className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="Administrator access required"
          description="This area is limited to accounts with the admin role. Row level security enforces the same restriction at the database level, so the data is protected even if this page were reachable."
          action={
            user ? (
              <ButtonLink href="/" variant="secondary" size="sm">
                Return home
              </ButtonLink>
            ) : (
              <ButtonLink href="/login" size="sm">
                Sign in
              </ButtonLink>
            )
          }
        />
      </Container>
    );
  }

  const [counts, recent] = await Promise.all([getTableCounts(), getRecentVariants()]);
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <Container className="py-16">
      <p className="text-label">Administration</p>
      <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
        CATALOGUE DASHBOARD
      </h1>
      <p className="mt-5 text-sm text-ink-400">
        Signed in as {user.displayName ?? user.email} · {formatNumber(total)} rows across{" "}
        {counts.length} tables
      </p>

      <section className="mt-14" aria-labelledby="counts-heading">
        <h2
          id="counts-heading"
          className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
        >
          Row counts
        </h2>
        <dl className="mt-8 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {counts.map((entry) => (
            <div key={entry.table} className="edge-light bg-surface-1/60 px-5 py-5">
              <dt className="text-label">{entry.label}</dt>
              <dd className="tabular mt-3 font-display text-2xl leading-none text-ink-50">
                {formatNumber(entry.count)}
              </dd>
              <p className="mt-2 font-mono text-[10px] text-ink-600">{entry.table}</p>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16" aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
        >
          Recently updated variants
        </h2>

        {recent.length === 0 ? (
          <p className="mt-6 text-sm text-ink-500">Nothing to show.</p>
        ) : (
          <ul className="mt-1">
            {recent.map((variant) => (
              <li
                key={variant.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle py-4"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-ink-100">
                    {variant.manufacturer} {variant.model}{" "}
                    <span className="text-ink-400">{variant.name}</span>
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-ink-600">
                    {new Date(variant.updated_at)
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}{" "}
                    UTC
                  </span>
                </span>
                <Badge tone={variant.is_published ? "positive" : "neutral"}>
                  {variant.is_published ? "Published" : "Draft"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="font-display text-[11px] tracking-[0.18em] text-ink-200 uppercase">
          Editing
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-400">
          This dashboard is read-only. Writes are admin-gated at the database level by row
          level security, so CRUD forms can be added here without any further policy work
          — the <code className="font-mono text-ink-200">is_admin()</code> check already
          guards every catalogue table.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-400">
          In the meantime, content is managed through{" "}
          <code className="font-mono text-ink-200">supabase/seed.sql</code> and the
          Supabase SQL editor. See the README for the SQL to add a country, manufacturer,
          model, variant or part.
        </p>
        <div className="mt-8">
          <Link
            href="/cars"
            className="font-display text-[10px] tracking-[0.18em] text-gold-300 uppercase transition-colors hover:text-gold-200"
          >
            View the public catalogue →
          </Link>
        </div>
      </section>
    </Container>
  );
}
