import { GlowOrbs, GridBackground, Scanlines } from "@/components/fx";

/**
 * The hero stage's decoration, in two layers that HeroStory places for us.
 *
 * `HeroBackdrop` sits under everything on the stage — a perspective floor
 * grid racing toward the viewer, two drifting glows, faint scan lines and a
 * cyan pool of light where the car stands — so the server-rendered drawing
 * and the loading scene both sit on a lit floor.
 *
 * The 3D canvas is opaque, so once the scene is drawn the backdrop is
 * hidden behind it; `HeroSceneOverlay` is laid over the canvas instead: the
 * same floor grid, screen-blended and masked to the lower half so it reads
 * as a projection on the scene's floor rather than a net over the car.
 *
 * Both are aria-hidden and pointer-events: none (the fx layers do this), and
 * all their movement is background-position and transform, stopped under
 * reduced motion by the CSS backstop.
 */
export function HeroBackdrop() {
  return (
    <>
      <GlowOrbs tone="cyan-violet" />
      <GridBackground variant="floor" size={56} />
      <Scanlines />
      {/* The pool of light under the car: bottom-centre on phones, right on
          wide screens. It is wider than the stage, so its own layer clips
          it — it must never widen the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute top-[62%] left-1/2 h-[40%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.8_0.14_210/16%),transparent)] lg:top-[52%] lg:left-[72%] lg:w-[64%]" />
      </div>
    </>
  );
}

export function HeroSceneOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 isolate [mask-image:linear-gradient(to_bottom,transparent_50%,black_74%)] opacity-45 mix-blend-screen"
    >
      <GridBackground variant="floor" size={56} className="z-0" />
    </div>
  );
}
