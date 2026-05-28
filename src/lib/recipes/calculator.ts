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
  scaleWithMeat?: boolean;
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
  scaleWithMeat: boolean;
  notes?: string | null;
}

export function calculateIngredients(
  meatAmount: number,
  meatUnit: MassUnit,
  ingredients: RecipeIngredient[],
  meatBaseGrams?: number,
): CalculatedIngredient[] {
  const meatGrams = toCanonical(meatAmount, meatUnit);
  const scaleFactor = meatBaseGrams && meatBaseGrams > 0 ? meatGrams / meatBaseGrams : 1;

  return [...ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ing) => {
      let canonical = 0;
      let amountGrams: number | null = null;
      const scaleWithMeat = ing.scaleWithMeat ?? true;

      if (ing.mode === "percent") {
        const pct = ing.percentOfMeat ?? 0;
        const grams = (meatGrams * pct) / 100;
        amountGrams = grams;
        if (ing.measurementType === "mass") {
          canonical = grams;
        } else if (ing.measurementType === "volume") {
          const density = ing.defaultDensityGPerMl ?? 1.0;
          canonical = grams / density;
        } else {
          canonical = grams;
        }
      } else {
        const base = ing.amountCanonical ?? 0;
        canonical = scaleWithMeat ? base * scaleFactor : base;
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
        scaleWithMeat,
        notes: ing.notes,
      };
    });
}

export function totalMassGrams(calculated: CalculatedIngredient[]): number {
  return calculated.reduce((sum, c) => sum + (c.amountGrams ?? 0), 0);
}
