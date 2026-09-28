import { describe, expect, it } from "vitest";
import { BOOT_FLAG_SCRIPT } from "./boot-script";

/**
 * Runs the real inline script against stand-ins for the browser globals it
 * reads, and reports what it did to <html>.
 */
function boot({
  cores,
  memory,
  saveData = false,
  session = {},
  local = {},
  storageThrows = false,
}: {
  cores?: number;
  memory?: number;
  saveData?: boolean;
  session?: Record<string, string>;
  local?: Record<string, string>;
  storageThrows?: boolean;
}) {
  const classes = new Set<string>();
  const attributes = new Map<string, string>();
  const document = {
    documentElement: {
      classList: { add: (name: string) => classes.add(name) },
      setAttribute: (name: string, value: string) => attributes.set(name, value),
    },
  };
  const store = (values: Record<string, string>) => ({
    getItem: (key: string) => {
      if (storageThrows) throw new Error("SecurityError");
      return values[key] ?? null;
    },
  });
  const navigator = {
    hardwareConcurrency: cores,
    deviceMemory: memory,
    connection: { saveData },
  };
  new Function(
    "document",
    "navigator",
    "sessionStorage",
    "localStorage",
    BOOT_FLAG_SCRIPT,
  )(document, navigator, store(session), store(local));
  return { classes, attributes };
}

describe("BOOT_FLAG_SCRIPT", () => {
  it("marks JavaScript as available", () => {
    expect(boot({ cores: 8, memory: 8 }).classes.has("js")).toBe(true);
  });

  it("hides the loading screen on a repeat visit", () => {
    const { attributes } = boot({
      cores: 8,
      memory: 8,
      session: { "aurix-booted": "1" },
    });
    expect(attributes.get("data-booted")).toBe("1");
  });

  it("keeps full effects on a capable device", () => {
    expect(boot({ cores: 8, memory: 8 }).classes.has("fx-lite")).toBe(false);
  });

  it("keeps full effects when the device reports nothing", () => {
    expect(boot({}).classes.has("fx-lite")).toBe(false);
  });

  it.each([
    ["four cores", { cores: 4, memory: 8 }],
    ["four GiB of memory", { cores: 8, memory: 4 }],
    ["Data Saver", { cores: 8, memory: 8, saveData: true }],
    [
      "slow frames earlier in the session",
      { cores: 8, memory: 8, session: { "aurix-fx-lite": "1" } },
    ],
  ])("turns on lite mode for %s", (_, signals) => {
    expect(boot(signals).classes.has("fx-lite")).toBe(true);
  });

  it("lets the visitor's explicit choice win either way", () => {
    expect(
      boot({ cores: 2, memory: 2, local: { "aurix-fx": "full" } }).classes.has("fx-lite"),
    ).toBe(false);
    expect(
      boot({ cores: 16, memory: 8, local: { "aurix-fx": "lite" } }).classes.has(
        "fx-lite",
      ),
    ).toBe(true);
  });

  it("survives storage that throws (privacy modes)", () => {
    const { classes } = boot({ cores: 8, memory: 8, storageThrows: true });
    expect(classes.has("js")).toBe(true);
    expect(classes.has("fx-lite")).toBe(false);
  });
});
