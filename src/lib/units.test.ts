import { describe, expect, it } from "vitest";
import {
  convert,
  fromCanonical,
  formatAmount,
  getMeasurementType,
  toCanonical,
  unitsForType,
} from "./units";

describe("toCanonical / fromCanonical (mass)", () => {
  it("converts kg to grams", () => {
    expect(toCanonical(1, "kg")).toBe(1000);
    expect(toCanonical(2.5, "kg")).toBe(2500);
  });

  it("converts pounds and ounces to grams", () => {
    expect(toCanonical(1, "lb")).toBeCloseTo(453.59237, 5);
    expect(toCanonical(1, "oz")).toBeCloseTo(28.349523125, 5);
    expect(toCanonical(16, "oz")).toBeCloseTo(453.59237, 5);
  });

  it("round-trips mass through canonical", () => {
    expect(fromCanonical(toCanonical(2.2, "lb"), "lb")).toBeCloseTo(2.2, 10);
    expect(fromCanonical(toCanonical(454, "g"), "kg")).toBeCloseTo(0.454, 10);
  });
});

describe("toCanonical / fromCanonical (volume)", () => {
  it("converts ml, l, fl oz, tsp, tbsp, cup", () => {
    expect(toCanonical(1, "l")).toBe(1000);
    expect(toCanonical(1, "floz")).toBeCloseTo(29.5735295625, 5);
    expect(toCanonical(1, "tsp")).toBeCloseTo(4.92892159375, 5);
    expect(toCanonical(1, "tbsp")).toBeCloseTo(14.78676478125, 5);
    expect(toCanonical(1, "cup")).toBeCloseTo(236.5882365, 5);
  });

  it("8 fl oz ≈ 1 cup", () => {
    expect(toCanonical(8, "floz")).toBeCloseTo(toCanonical(1, "cup"), 5);
  });

  it("3 tsp = 1 tbsp", () => {
    expect(toCanonical(3, "tsp")).toBeCloseTo(toCanonical(1, "tbsp"), 10);
  });
});

describe("convert (same type)", () => {
  it("converts kg to lb", () => {
    expect(convert(1, "kg", "lb")).toBeCloseTo(2.20462262, 5);
  });

  it("converts lb to kg", () => {
    expect(convert(2.20462262, "lb", "kg")).toBeCloseTo(1, 5);
  });

  it("converts l to fl oz", () => {
    expect(convert(1, "l", "floz")).toBeCloseTo(33.8140227, 4);
  });

  it("converts cm to m", () => {
    expect(convert(150, "cm", "m")).toBeCloseTo(1.5, 10);
  });
});

describe("convert (mass ↔ volume with density)", () => {
  it("mass→volume requires density", () => {
    expect(() => convert(100, "g", "ml")).toThrow();
  });

  it("100 g water (density 1) = 100 ml", () => {
    expect(convert(100, "g", "ml", 1)).toBeCloseTo(100, 5);
  });

  it("100 ml of wine (density 0.99) ≈ 99 g", () => {
    expect(convert(100, "ml", "g", 0.99)).toBeCloseTo(99, 5);
  });

  it("rejects zero/negative density", () => {
    expect(() => convert(100, "g", "ml", 0)).toThrow();
    expect(() => convert(100, "g", "ml", -1)).toThrow();
  });
});

describe("getMeasurementType / unitsForType", () => {
  it("classifies units correctly", () => {
    expect(getMeasurementType("g")).toBe("mass");
    expect(getMeasurementType("lb")).toBe("mass");
    expect(getMeasurementType("ml")).toBe("volume");
    expect(getMeasurementType("floz")).toBe("volume");
    expect(getMeasurementType("cm")).toBe("length");
    expect(getMeasurementType("piece")).toBe("count");
  });

  it("returns proper unit list", () => {
    expect(unitsForType("mass")).toEqual(["g", "kg", "oz", "lb"]);
    expect(unitsForType("volume")).toEqual(["ml", "l", "floz", "tsp", "tbsp", "cup"]);
    expect(unitsForType("length")).toEqual(["cm", "m"]);
    expect(unitsForType("count")).toEqual(["piece"]);
  });
});

describe("formatAmount", () => {
  it("formats with appropriate decimals", () => {
    expect(formatAmount(1234.5678, "g", "en")).toBe("1,234.57 g");
    expect(formatAmount(2.5, "kg", "en")).toBe("2.5 kg");
    expect(formatAmount(1, "piece", "es")).toBe("1 u");
    expect(formatAmount(15.5, "cm", "en")).toBe("15.5 cm");
  });

  it("localizes labels", () => {
    expect(formatAmount(1, "lb", "es")).toBe("1 lb");
    expect(formatAmount(1, "tsp", "es")).toBe("1 cdta");
    expect(formatAmount(1, "tsp", "en")).toBe("1 tsp");
  });
});
