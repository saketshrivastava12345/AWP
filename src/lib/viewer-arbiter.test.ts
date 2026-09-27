import { describe, expect, it, vi } from "vitest";
import { createRenderArbiter } from "./viewer-arbiter";

describe("render arbiter", () => {
  it("lets a lone visible scene render and nobody when nothing is visible", () => {
    const arbiter = createRenderArbiter();
    expect(arbiter.winner()).toBeNull();
    arbiter.report("viewer", 50_000);
    expect(arbiter.winner()).toBe("viewer");
    arbiter.report("viewer", 0);
    expect(arbiter.winner()).toBeNull();
  });

  it("gives the slot to the most visible scene", () => {
    const arbiter = createRenderArbiter();
    arbiter.report("tour", 400_000);
    arbiter.report("viewer", 100_000);
    expect(arbiter.winner()).toBe("tour");
    arbiter.report("viewer", 600_000);
    expect(arbiter.winner()).toBe("viewer");
  });

  it("does not flap when two scenes are nearly equally visible", () => {
    const arbiter = createRenderArbiter({ hysteresis: 1.15 });
    arbiter.report("tour", 300_000);
    arbiter.report("viewer", 310_000);
    expect(arbiter.winner()).toBe("tour");
    arbiter.report("viewer", 360_000);
    expect(arbiter.winner()).toBe("viewer");
  });

  it("hands over when the winner unmounts, and notifies listeners", () => {
    const arbiter = createRenderArbiter();
    const listener = vi.fn();
    arbiter.subscribe(listener);
    arbiter.report("tour", 200_000);
    arbiter.report("viewer", 100_000);
    listener.mockClear();
    arbiter.remove("tour");
    expect(arbiter.winner()).toBe("viewer");
    expect(listener).toHaveBeenCalledTimes(1);
    arbiter.remove("viewer");
    expect(arbiter.winner()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
