import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/** A record that does not exist (deleted, or a mistyped address). */
export default function AdminNotFound() {
  return (
    <EmptyState
      icon={<SearchX className="size-7" strokeWidth={1.25} aria-hidden="true" />}
      title="Not found"
      description="That record does not exist. It may have been deleted, or the address is incomplete."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/admin/vehicles" size="sm">
            Vehicles
          </ButtonLink>
          <ButtonLink href="/admin" size="sm" variant="secondary">
            Dashboard
          </ButtonLink>
        </div>
      }
    />
  );
}
