/**
 * "Lite" effects mode, for devices that cannot afford continuous ambient
 * motion: `html.fx-lite`. It keeps the whole HUD look — grids, glows, scan
 * lines, brackets, panels — but stops the ambient loops (drifting grids and
 * orbs, sweeping beams, breathing dots, dashed flows), the cursor glow, the
 * pointer spotlight and backdrop blur. Entrances, reveals, count-ups, tilts,
 * the marquee and the 3D scenes are unchanged (the scenes have their own
 * quality tiers, see src/lib/viewer-quality.ts).
 *
 * Decided in two places:
 *   - before first paint, by the boot script (src/lib/boot-script.ts), from
 *     what the device says about itself: few CPU cores, little memory, Data
 *     Saver, or an earlier slow-frame verdict in this session;
 *   - after load, by the FX runtime, from measured frame times at rest
 *     (`framesTooSlow`), remembered for the rest of the session.
 *
 * `localStorage["aurix-fx"] = "full" | "lite"` overrides both.
 *
 * Pure: no DOM access here, so both halves can be unit-tested.
 */

/** sessionStorage: "1" once this session has measured slow frames. */
export const FX_LITE_SESSION_KEY = "aurix-fx-lite";

/** localStorage: an explicit "full" or "lite", which wins over detection. */
export const FX_MODE_STORAGE_KEY = "aurix-fx";

/** The class set on <html> while lite mode is on. */
export const FX_LITE_CLASS = "fx-lite";

/** At most this many logical cores counts as a low-power device. */
export const LITE_MAX_CORES = 4;
/** At most this much memory (GiB, navigator.deviceMemory) counts as low-power. */
export const LITE_MAX_MEMORY_GB = 4;

/**
 * Frame intervals (ms) measured at rest, with only the page's own motion
 * running: too slow to keep the ambient loops? A median over 28 ms (under
 * ~36 fps) or one frame in five over 50 ms means the device is already
 * dropping frames before the visitor has done anything.
 *
 * Fewer than 10 samples means the sample was cut short (a hidden tab), not
 * that the device is slow: no verdict.
 */
export function framesTooSlow(intervals: readonly number[]): boolean {
  if (intervals.length < 10) return false;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const long = intervals.filter((ms) => ms > 50).length;
  return median > 28 || long / intervals.length >= 0.2;
}
