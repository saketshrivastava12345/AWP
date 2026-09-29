import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/** A record that does not exist (deleted, or a mistyped address). */
export default function AdminNotFound() {
  return (
    <div>
      <p aria-hidden="true" className="mb-4 hud-label">
        SYS // 404
      </p>
      <h1 className="text-h2">
        <span className="fx-glitch inline-block" data-text="Not found">
          Not found
        </span>
      </h1>
      <EmptyState
        className="mt-8"
        icon={<SearchX className="size-7" strokeWidth={1.25} aria-hidden="true" />}
        title="No such record"
        description="That record does not exist. It may have been deleted, or the address is incomplete."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/admin/vehicles">Vehicles</ButtonLink>
            <ButtonLink href="/admin" variant="secondary">
              Dashboard
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
