import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

/** A record that does not exist (deleted, or a mistyped address). */
export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center rounded-card bg-surface-1 px-6 py-16 text-center sm:py-20">
      <SearchX className="size-7 text-ink-400" strokeWidth={1.25} aria-hidden="true" />
      <h1 className="mt-6 text-h3">Not found</h1>
      <p className="mt-3 max-w-md text-body text-ink-400">
        That record does not exist. It may have been deleted, or the address is
        incomplete.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/admin/vehicles">Vehicles</ButtonLink>
        <ButtonLink href="/admin" variant="secondary">
          Dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
