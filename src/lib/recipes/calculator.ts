import {
  fromIngredientCanonical,
  toCanonical,
  type MassUnit,
  type Unit,
} from "../units";

export interface RecipeIngredient {
  id: string;
  name: string;
  measurementType: "mass" | "volume" | "length" | "count";
  defaultDensityGPerMl?: number | null;
  mode: "percent" | "absolute";
  percentOfMeat?: number | null;
  amountCanonical?: number | null;
  displayUnit: Unit;
  notes?: string | null;
  sortOrder: number;
}

export interface CalculatedIngredient {
  id: string;
  name: string;
  mode: "percent" | "absolute";
  amountInDisplayUnit: number;
  displayUnit: Unit;
  amountCanonical: number;
  amountGrams: number | null;
  percentOfMeat: number | null;
  notes?: string | null;
}

/**
 * Compute the absolute amount of every ingredient given a meat weight.
 *
 * For `percent` ingredients the canonical amount is derived from the meat
 * grams. If the ingredient is volume-based, density converts grams → ml.
 * For `absolute` ingredients the stored canonical value is used directly.
 */
export function calculateIngredients(
  meatAmount: number,
  meatUnit: MassUnit,
  ingredients: RecipeIngredient[],
): CalculatedIngredient[] {
  const meatGrams = toCanonical(meatAmount, meatUnit);

  return [...ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ing) => {
      let canonical = 0;
      let amountGrams: number | null = null;

      if (ing.mode === "percent") {
        const pct = ing.percentOfMeat ?? 0;
        const grams = (meatGrams * pct) / 100;
        amountGrams = grams;
        if (ing.measurementType === "mass") {
          canonical = grams;
        } else if (ing.measurementType === "volume") {
          const density = ing.defaultDensityGPerMl ?? 1.0;
          canonical = grams / density;
        } else if (ing.measurementType === "length") {
          canonical = grams;
        } else {
          canonical = grams;
        }
      } else {
        canonical = ing.amountCanonical ?? 0;
        if (ing.measurementType === "mass") {
          amountGrams = canonical;
        } else if (ing.measurementType === "volume" && ing.defaultDensityGPerMl) {
          amountGrams = canonical * ing.defaultDensityGPerMl;
        }
      }

      const amountInDisplayUnit = fromIngredientCanonical(
        canonical,
        ing.displayUnit,
        ing.measurementType,
        ing.defaultDensityGPerMl,
      );

      return {
        id: ing.id,
        name: ing.name,
        mode: ing.mode,
        amountInDisplayUnit,
        displayUnit: ing.displayUnit,
        amountCanonical: canonical,
        amountGrams,
        percentOfMeat: ing.mode === "percent" ? ing.percentOfMeat ?? 0 : null,
        notes: ing.notes,
      };
    });
}

/**
 * Sum total mass of all mass-type ingredients in grams. Useful to display
 * "total recipe weight" alongside the calculator.
 */
export function totalMassGrams(calculated: CalculatedIngredient[]): number {
  return calculated.reduce((sum, c) => sum + (c.amountGrams ?? 0), 0);
}
