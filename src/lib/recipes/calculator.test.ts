import { describe, expect, it } from "vitest";
import { calculateIngredients, type RecipeIngredient } from "./calculator";

const baseIngredients: RecipeIngredient[] = [
  {
    id: "salt",
    name: "Sal",
    measurementType: "mass",
    mode: "percent",
    percentOfMeat: 2.8,
    displayUnit: "g",
    sortOrder: 0,
  },
  {
    id: "paprika",
    name: "Pimentón dulce",
    measurementType: "mass",
    mode: "percent",
    percentOfMeat: 1.0,
    displayUnit: "g",
    sortOrder: 1,
  },
  {
    id: "wine",
    name: "Vino blanco",
    measurementType: "volume",
    defaultDensityGPerMl: 0.99,
    mode: "percent",
    percentOfMeat: 5.0,
    displayUnit: "ml",
    sortOrder: 2,
  },
  {
    id: "casing",
    name: "Tripa natural",
    measurementType: "length",
    mode: "absolute",
    amountCanonical: 200,
    displayUnit: "cm",
    sortOrder: 3,
  },
  {
    id: "garlic",
    name: "Diente de ajo",
    measurementType: "count",
    mode: "absolute",
    amountCanonical: 6,
    displayUnit: "piece",
    sortOrder: 4,
  },
];

describe("calculateIngredients", () => {
  it("scales percent ingredients to 1 kg of meat", () => {
    const out = calculateIngredients(1, "kg", baseIngredients);
    const salt = out.find((i) => i.id === "salt")!;
    const paprika = out.find((i) => i.id === "paprika")!;
    expect(salt.amountInDisplayUnit).toBeCloseTo(28, 5);
    expect(paprika.amountInDisplayUnit).toBeCloseTo(10, 5);
  });

  it("scales percent ingredients to 2.5 kg of meat", () => {
    const out = calculateIngredients(2.5, "kg", baseIngredients);
    const salt = out.find((i) => i.id === "salt")!;
    expect(salt.amountInDisplayUnit).toBeCloseTo(70, 5);
  });

  it("scales percent ingredients given pounds of meat", () => {
    const out = calculateIngredients(2, "lb", baseIngredients);
    const salt = out.find((i) => i.id === "salt")!;
    expect(salt.amountInDisplayUnit).toBeCloseTo(2 * 453.59237 * 0.028, 5);
  });

  it("converts percent into volume using density", () => {
    const out = calculateIngredients(1, "kg", baseIngredients);
    const wine = out.find((i) => i.id === "wine")!;
    expect(wine.amountInDisplayUnit).toBeCloseTo(50 / 0.99, 5);
    expect(wine.amountGrams).toBeCloseTo(50, 5);
  });

  it("keeps absolute amounts independent of meat weight", () => {
    const a = calculateIngredients(1, "kg", baseIngredients);
    const b = calculateIngredients(10, "kg", baseIngredients);
    expect(a.find((i) => i.id === "casing")!.amountInDisplayUnit).toBe(200);
    expect(b.find((i) => i.id === "casing")!.amountInDisplayUnit).toBe(200);
    expect(a.find((i) => i.id === "garlic")!.amountInDisplayUnit).toBe(6);
  });

  it("respects each ingredient's display unit", () => {
    const ingredients: RecipeIngredient[] = [
      {
        id: "salt",
        name: "Sal",
        measurementType: "mass",
        mode: "percent",
        percentOfMeat: 2.8,
        displayUnit: "oz",
        sortOrder: 0,
      },
    ];
    const out = calculateIngredients(1, "kg", ingredients);
    expect(out[0].amountInDisplayUnit).toBeCloseTo(28 / 28.349523125, 5);
  });

  it("sorts by sortOrder", () => {
    const reversed = [...baseIngredients].map((i) => ({ ...i, sortOrder: -i.sortOrder }));
    const out = calculateIngredients(1, "kg", reversed);
    expect(out.map((i) => i.id)).toEqual(["garlic", "casing", "wine", "paprika", "salt"]);
  });

  it("handles zero meat gracefully", () => {
    const out = calculateIngredients(0, "kg", baseIngredients);
    const salt = out.find((i) => i.id === "salt")!;
    expect(salt.amountInDisplayUnit).toBe(0);
    expect(out.find((i) => i.id === "casing")!.amountInDisplayUnit).toBe(200);
  });
});
