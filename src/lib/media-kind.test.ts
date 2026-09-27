import { describe, expect, it } from "vitest";
import {
  AI_ILLUSTRATION_LICENSE,
  isAiIllustration,
  isAiIllustrationUrl,
} from "./media-kind";

describe("isAiIllustration", () => {
  it("recognises the licence marker", () => {
    expect(isAiIllustration({ license: AI_ILLUSTRATION_LICENSE })).toBe(true);
    expect(isAiIllustration({ license: "ai generated artwork" })).toBe(true);
  });

  it("recognises the committed illustrations folder", () => {
    expect(isAiIllustrationUrl("/images/cars/ai/lamborghini-revuelto-side.webp")).toBe(true);
    expect(
      isAiIllustration({ url: "/images/cars/ai/porsche-911-turbo-s-side.webp" }),
    ).toBe(true);
  });

  it("leaves photographs alone", () => {
    expect(
      isAiIllustration({ url: "/images/cars/porsche-911-gt3.jpg", license: "CC BY-SA 4.0" }),
    ).toBe(false);
    expect(isAiIllustration({ url: null, license: null })).toBe(false);
    expect(isAiIllustrationUrl("/images/cars/aidan-photo.jpg")).toBe(false);
  });
});
