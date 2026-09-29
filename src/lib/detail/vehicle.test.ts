import { describe, expect, it } from "vitest";
import {
  carPath,
  compareHref,
  generationName,
  identityLine,
  keyFigures,
  vehicleCode,
} from "./vehicle";
import { makeDetail } from "./test-fixtures";

describe("identity", () => {
  it("builds the generation · years · body · category line from what is recorded", () => {
    expect(identityLine(makeDetail())).toEqual([
      "992",
      "2021 – present",
      "Coupe",
      "Sports Car",
    ]);
    expect(
      identityLine(
        makeDetail({
          model: { generation: null, body_type: "suv" },
          variant: { year_start: 2019, year_end: 2024 },
        }),
      ),
    ).toEqual(["2019 – 2024", "SUV", "Sports Car"]);
  });

  it("does not repeat a category that only restates the body type", () => {
    const detail = makeDetail({ model: { body_type: "suv" } });
    detail.category = { ...detail.category, name: "SUV" };
    expect(identityLine(detail)).toEqual(["992", "2021 – present", "SUV"]);
  });

  it("prefers the generation row to the model's text column", () => {
    const detail = makeDetail({
      generation: {
        id: "g",
        model_id: "model-911",
        name: "992.2",
        slug: "992-2",
        year_start: 2024,
        year_end: null,
        description: null,
        created_at: "",
        updated_at: "",
      },
    });
    expect(generationName(detail)).toBe("992.2");
  });

  it("makes a vehicle code from the slugs without repeating the model", () => {
    expect(vehicleCode(makeDetail())).toBe("911-GT3 · 992");
    expect(
      vehicleCode(
        makeDetail({
          model: { slug: "296-gtb", generation: "F171" },
          variant: { slug: "296-gtb" },
        }),
      ),
    ).toBe("296-GTB · F171");
    expect(vehicleCode(makeDetail({ model: { generation: null } }))).toBe("911-GT3");
  });

  it("links to the car and to compare in the documented URL shapes", () => {
    expect(carPath(makeDetail())).toBe("/cars/porsche/911/gt3");
    expect(compareHref(makeDetail())).toBe("/compare?car=porsche/911/gt3");
  });
});

describe("keyFigures", () => {
  it("formats published figures and leaves missing ones null", () => {
    const figures = keyFigures(
      makeDetail({ performance: { torque_nm: null } }).performance,
    );
    expect(figures.map((figure) => [figure.id, figure.value, figure.unit])).toEqual([
      ["power", "510", "hp"],
      ["torque", null, "Nm"],
      ["acceleration", "3.4", "s"],
      ["topSpeed", "320", "km/h"],
    ]);
  });

  it("copes with no performance row at all", () => {
    expect(keyFigures(null).every((figure) => figure.value === null)).toBe(true);
  });
});
