import { describe, expect, it } from "vitest";
import { buildBreadcrumbJsonLd, buildCarJsonLd, serializeJsonLd } from "./json-ld";
import { makeDetail } from "./test-fixtures";

const url = "https://aurix.example/cars/porsche/911/gt3";

describe("buildCarJsonLd", () => {
  it("describes the car with readable labels and schema.org enumerations", () => {
    const data = buildCarJsonLd(makeDetail({ fuel: { tank_capacity_l: 64 } }), {
      url,
      imageUrl: "https://aurix.example/images/cars/porsche-911-gt3.jpg",
    });
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Car",
      name: "Porsche 911 GT3",
      url,
      brand: { "@type": "Brand", name: "Porsche" },
      manufacturer: { "@type": "Organization", name: "Porsche" },
      model: "911",
      vehicleModelDate: "2021",
      bodyType: "Coupe",
      fuelType: "Petrol",
      driveWheelConfiguration: "https://schema.org/RearWheelDriveConfiguration",
      vehicleEngine: {
        "@type": "EngineSpecification",
        engineDisplacement: { value: 3996, unitCode: "CMQ" },
        enginePower: { value: 510, unitText: "hp" },
        torque: { value: 470, unitCode: "NMT" },
      },
      accelerationTime: { value: 3.4, unitCode: "SEC" },
      speed: { maxValue: 320, unitCode: "KMH" },
      weight: { value: 1418, unitCode: "KGM" },
      depth: { value: 4573, unitCode: "MMT" },
      width: { value: 1852, unitCode: "MMT" },
      height: { value: 1279, unitCode: "MMT" },
      wheelbase: { value: 2457, unitCode: "MMT" },
      seatingCapacity: 2,
      fuelCapacity: { value: 64, unitCode: "LTR" },
      image: "https://aurix.example/images/cars/porsche-911-gt3.jpg",
    });
    // Unknown, so absent — never guessed.
    expect(data).not.toHaveProperty("numberOfDoors");
    expect(data).not.toHaveProperty("offers");
  });

  it("maps every drive type to its schema.org configuration", () => {
    const drive = (drive_type: "fwd" | "awd" | "4wd") =>
      buildCarJsonLd(makeDetail({ variant: { drive_type } }), { url })
        .driveWheelConfiguration;
    expect(drive("fwd")).toBe("https://schema.org/FrontWheelDriveConfiguration");
    expect(drive("awd")).toBe("https://schema.org/AllWheelDriveConfiguration");
    expect(drive("4wd")).toBe("https://schema.org/FourWheelDriveConfiguration");
  });

  it("omits every figure that is not published", () => {
    const data = buildCarJsonLd(
      makeDetail({
        engine: null,
        performance: null,
        dimensions: null,
        transmission: null,
      }),
      { url },
    );
    for (const key of [
      "vehicleEngine",
      "accelerationTime",
      "speed",
      "weight",
      "depth",
      "width",
      "height",
      "wheelbase",
      "seatingCapacity",
      "vehicleTransmission",
      "image",
    ]) {
      expect(data).not.toHaveProperty(key);
    }
  });

  it("does not repeat a variant name that restates the model", () => {
    const data = buildCarJsonLd(
      makeDetail({
        manufacturer: { name: "Ferrari" },
        model: { name: "296 GTB" },
        variant: { name: "296 GTB" },
      }),
      { url },
    );
    expect(data.name).toBe("Ferrari 296 GTB");
  });

  it("adds an offer only for a sourced price that is passed in", () => {
    const data = buildCarJsonLd(makeDetail(), {
      url,
      price: {
        amount: "33700000",
        currency: "inr",
        areaServed: "Mumbai, India",
        validFrom: "2026-09-12",
        priceType: "ex_showroom",
      },
    });
    expect(data.offers).toEqual({
      "@type": "Offer",
      price: 33700000,
      priceCurrency: "INR",
      url,
      areaServed: "Mumbai, India",
      validFrom: "2026-09-12",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: 33700000,
        priceCurrency: "INR",
        priceType: "https://schema.org/ListPrice",
        name: "Ex-showroom",
      },
    });
  });

  it("drops an offer with an unusable amount or currency", () => {
    expect(
      buildCarJsonLd(makeDetail(), { url, price: { amount: "n/a", currency: "INR" } }),
    ).not.toHaveProperty("offers");
    expect(
      buildCarJsonLd(makeDetail(), { url, price: { amount: 100, currency: "rupees" } }),
    ).not.toHaveProperty("offers");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("numbers the trail from 1", () => {
    expect(
      buildBreadcrumbJsonLd([
        { name: "Cars", url: "https://aurix.example/cars" },
        { name: "Porsche", url: "https://aurix.example/manufacturers/porsche" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Cars",
          item: "https://aurix.example/cars",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Porsche",
          item: "https://aurix.example/manufacturers/porsche",
        },
      ],
    });
  });
});

describe("serializeJsonLd", () => {
  it("cannot be closed early by text from the database", () => {
    const json = serializeJsonLd({
      description: "Fast </script><script>alert(1)</script> & loud",
    });
    expect(json).not.toContain("<");
    expect(json).not.toContain(">");
    expect(json).toContain("\\u003c/script\\u003e");
    // Still valid JSON that decodes to the original text.
    expect(JSON.parse(json)).toEqual({
      description: "Fast </script><script>alert(1)</script> & loud",
    });
  });

  it("escapes the JavaScript line separators", () => {
    const json = serializeJsonLd({ text: "a\u2028b\u2029c" });
    expect(json).toBe('{"text":"a\\u2028b\\u2029c"}');
    expect(JSON.parse(json)).toEqual({ text: "a\u2028b\u2029c" });
  });
});
