import { describe, expect, it } from "vitest";
import {
  buildGallery,
  creditLine,
  galleryGroupOf,
  isOptimizableImage,
  licenseUrl,
  mediaCredit,
  parseLegacyCredit,
} from "./gallery";
import { makeMedia } from "./test-fixtures";

describe("galleryGroupOf", () => {
  it("maps shots onto the gallery's groups", () => {
    expect(galleryGroupOf("three_quarter")).toBe("exterior");
    expect(galleryGroupOf("gallery")).toBe("exterior");
    expect(galleryGroupOf(null)).toBe("exterior");
    expect(galleryGroupOf("dashboard")).toBe("interior");
    expect(galleryGroupOf("engine")).toBe("engine");
    expect(galleryGroupOf("wheel")).toBe("wheels");
    expect(galleryGroupOf("detail")).toBe("details");
  });
});

describe("credits", () => {
  it("reads the legacy credit written by fetch-images.mjs", () => {
    expect(
      parseLegacyCredit("Photo: Vauxford / Wikimedia Commons (CC BY-SA 4.0)"),
    ).toEqual({
      author: "Vauxford",
      sourceName: "Wikimedia Commons",
      license: "CC BY-SA 4.0",
    });
    expect(
      parseLegacyCredit(
        "Photo: Guyon from Richmond, VA, United States of America / Wikimedia Commons (CC BY 2.0)",
      )?.author,
    ).toBe("Guyon from Richmond, VA, United States of America");
    expect(parseLegacyCredit("Courtesy of the manufacturer")).toBeNull();
  });

  it("links Creative Commons licences to their deeds and nothing else", () => {
    expect(licenseUrl("CC BY-SA 4.0")).toBe(
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
    expect(licenseUrl("cc by 2.0")).toBe("https://creativecommons.org/licenses/by/2.0/");
    expect(licenseUrl("CC BY-NC-SA 3.0")).toBe(
      "https://creativecommons.org/licenses/by-nc-sa/3.0/",
    );
    expect(licenseUrl("CC BY-SA 3.0 de")).toBe(
      "https://creativecommons.org/licenses/by-sa/3.0/de/",
    );
    expect(licenseUrl("CC0")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
    expect(licenseUrl("All rights reserved")).toBeNull();
    expect(licenseUrl(null)).toBeNull();
  });

  it("prefers the structured columns over the legacy text", () => {
    const credit = mediaCredit(
      makeMedia({
        id: "a",
        url: "/a.jpg",
        author: "Jane Doe",
        license: "CC BY 4.0",
        source: "Wikimedia Commons",
        source_url: "https://commons.wikimedia.org/wiki/File:A.jpg",
        credit: "Photo: Someone Else / Flickr (CC BY-SA 2.0)",
      }),
    );
    expect(credit).toEqual({
      author: "Jane Doe",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceName: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
      text: null,
      aiGenerated: false,
    });
    expect(creditLine(credit)).toBe("Photo: Jane Doe · Wikimedia Commons · CC BY 4.0");
  });

  it("never credits an AI-generated illustration as a photograph", () => {
    const credit = mediaCredit(
      makeMedia({
        id: "ai",
        url: "/images/cars/ai/lamborghini-revuelto-side.webp",
        author: null,
        license: "AI-generated illustration",
        source: "Supplied by the site owner",
        source_url: null,
        credit: null,
      }),
    );
    expect(credit?.aiGenerated).toBe(true);
    expect(creditLine(credit)).toBe(
      "AI-generated illustration, not a photograph · Supplied by the site owner",
    );
  });

  it("falls back to the legacy text, parsed when possible and verbatim otherwise", () => {
    const parsed = mediaCredit(
      makeMedia({
        id: "b",
        url: "/b.jpg",
        credit: "Photo: test / Wikimedia Commons (CC BY-SA 4.0)",
      }),
    );
    expect(parsed).toMatchObject({
      author: "test",
      sourceName: "Wikimedia Commons",
      license: "CC BY-SA 4.0",
      text: null,
    });

    const verbatim = mediaCredit(
      makeMedia({ id: "c", url: "/c.jpg", credit: "Press image" }),
    );
    expect(verbatim).toMatchObject({ author: null, text: "Press image" });
    expect(creditLine(verbatim)).toBe("Press image");
  });

  it("is null only when nothing at all is recorded", () => {
    expect(mediaCredit(makeMedia({ id: "d", url: "/d.jpg" }))).toBeNull();
  });
});

describe("buildGallery", () => {
  it("puts the variant's photographs first, then the model's, grouped by shot", () => {
    const gallery = buildGallery(
      [
        makeMedia({ id: "v1", url: "/v1.jpg", shot: "interior" }),
        makeMedia({ id: "v2", url: "/v2.jpg", shot: "three_quarter", is_primary: true }),
        makeMedia({ id: "glb", url: "/car.glb", type: "glb", is_exact_model: false }),
      ],
      [
        makeMedia({
          id: "m1",
          url: "/m1.jpg",
          shot: null,
          variant_id: null,
          model_id: "m",
        }),
        // Registered twice: shown once.
        makeMedia({ id: "m2", url: "/v1.jpg", shot: "interior", variant_id: null }),
      ],
      "Porsche 911 GT3",
    );
    expect(gallery.images.map((image) => image.id)).toEqual(["v2", "m1", "v1"]);
    expect(gallery.images.map((image) => image.scope)).toEqual([
      "variant",
      "model",
      "variant",
    ]);
    expect(gallery.groups).toEqual([
      { id: "exterior", label: "Exterior", count: 2 },
      { id: "interior", label: "Interior", count: 1 },
    ]);
  });

  it("writes alt text from the car's name only when a row has none", () => {
    const gallery = buildGallery(
      [
        makeMedia({ id: "a", url: "/a.jpg", alt: "Porsche 911 GT3 at Goodwood" }),
        makeMedia({ id: "b", url: "/b.jpg", shot: "wheel" }),
      ],
      [],
      "Porsche 911 GT3",
    );
    expect(gallery.images.map((image) => image.alt)).toEqual([
      "Porsche 911 GT3 at Goodwood",
      "Porsche 911 GT3 — wheel photograph",
    ]);
  });

  it("is empty when no photograph is catalogued", () => {
    expect(buildGallery([], [], "Car")).toEqual({ images: [], groups: [] });
  });
});

describe("isOptimizableImage", () => {
  const supabase = "http://127.0.0.1:54321";
  it("optimises local files and the project's public storage only", () => {
    expect(isOptimizableImage("/images/cars/porsche-911-gt3.jpg", supabase)).toBe(true);
    expect(
      isOptimizableImage(
        "http://127.0.0.1:54321/storage/v1/object/public/car-media/a.jpg",
        supabase,
      ),
    ).toBe(true);
    expect(isOptimizableImage("https://upload.wikimedia.org/a.jpg", supabase)).toBe(
      false,
    );
    expect(isOptimizableImage("//evil.example/a.jpg", supabase)).toBe(false);
    expect(isOptimizableImage("http://127.0.0.1:54321/rest/v1/x", supabase)).toBe(false);
    expect(
      isOptimizableImage("https://x.supabase.co/storage/v1/object/public/a.jpg", null),
    ).toBe(false);
  });
});
