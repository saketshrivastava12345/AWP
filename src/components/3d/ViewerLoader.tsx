import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export type LoaderProgress = {
  model: number | null;
  textures: number | null;
  environment: number | null;
};

/**
 * "Loading vehicle", with one row per real signal: the model (bytes of a GLB,
 * or the procedural build), its textures, and the lighting environment —
 * which completes with the first frame actually drawn. No timers: a row that
 * has not started shows as waiting.
 */
export function ViewerLoader({
  progress,
  visible,
}: {
  progress: LoaderProgress;
  visible: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={cn(
        "pointer-events-none absolute inset-0 grid place-items-center bg-surface-1/90 transition-opacity duration-(--duration-normal)",
        // Faded out, it stays mounted for the next load: its pulsing dot and
        // waiting bars must not keep animating unseen for the whole visit.
        visible ? "opacity-100" : "opacity-0 [&_*]:animate-none",
      )}
    >
      <div className="w-[min(18rem,80%)] px-5 py-4 hud-corners [--hud-c:var(--color-cyan-300)]">
        <p className="flex items-center gap-2 font-mono text-micro tracking-hud text-cyan-200 uppercase">
          <span
            aria-hidden="true"
            className="size-1.5 animate-pulse-glow rounded-full bg-cyan-400"
          />
          Loading vehicle
        </p>
        <div className="mt-3 space-y-2">
          <Progress label="Model" value={progress.model} />
          <Progress label="Textures" value={progress.textures} />
          <Progress label="Environment" value={progress.environment} />
        </div>
      </div>
    </div>
  );
}
