export type MassUnit = "g" | "kg" | "oz" | "lb";
export type VolumeUnit = "ml" | "l" | "floz" | "tsp" | "tbsp" | "cup";
export type LengthUnit = "cm" | "m";
export type CountUnit = "piece";

export type Unit = MassUnit | VolumeUnit | LengthUnit | CountUnit;

export type MeasurementType = "mass" | "volume" | "length" | "count";

export const MASS_UNITS: MassUnit[] = ["g", "kg", "oz", "lb"];
export const VOLUME_UNITS: VolumeUnit[] = ["ml", "l", "floz", "tsp", "tbsp", "cup"];
export const LENGTH_UNITS: LengthUnit[] = ["cm", "m"];
export const COUNT_UNITS: CountUnit[] = ["piece"];

const MASS_TO_GRAMS: Record<MassUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
};

const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  ml: 1,
  l: 1000,
  floz: 29.5735295625,
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  cup: 236.5882365,
};

const LENGTH_TO_CM: Record<LengthUnit, number> = {
  cm: 1,
  m: 100,
};

export function getMeasurementType(unit: Unit): MeasurementType {
  if ((MASS_UNITS as string[]).includes(unit)) return "mass";
  if ((VOLUME_UNITS as string[]).includes(unit)) return "volume";
  if ((LENGTH_UNITS as string[]).includes(unit)) return "length";
  return "count";
}

export function unitsForType(type: MeasurementType): Unit[] {
  switch (type) {
    case "mass":
      return MASS_UNITS;
    case "volume":
      return VOLUME_UNITS;
    case "length":
      return LENGTH_UNITS;
    case "count":
      return COUNT_UNITS;
  }
}

/**
 * Converts an amount in `unit` to the canonical unit for that type:
 * - mass → grams
 * - volume → milliliters
 * - length → centimeters
 * - count → count (no change)
 *
 * Cross-type conversions (mass ↔ volume) require `densityGPerMl`.
 */
export function toCanonical(amount: number, unit: Unit): number {
  const type = getMeasurementType(unit);
  if (type === "mass") return amount * MASS_TO_GRAMS[unit as MassUnit];
  if (type === "volume") return amount * VOLUME_TO_ML[unit as VolumeUnit];
  if (type === "length") return amount * LENGTH_TO_CM[unit as LengthUnit];
  return amount;
}

/**
 * Converts an amount from canonical units back to `targetUnit`.
 * Canonical means: grams (mass), ml (volume), cm (length), count (count).
 */
export function fromCanonical(canonical: number, targetUnit: Unit): number {
  const type = getMeasurementType(targetUnit);
  if (type === "mass") return canonical / MASS_TO_GRAMS[targetUnit as MassUnit];
  if (type === "volume") return canonical / VOLUME_TO_ML[targetUnit as VolumeUnit];
  if (type === "length") return canonical / LENGTH_TO_CM[targetUnit as LengthUnit];
  return canonical;
}

/**
 * Convert amount from one unit to another within the same measurement type.
 * For cross-type (mass↔volume) provide `densityGPerMl`.
 */
export function convert(
  amount: number,
  fromUnit: Unit,
  toUnit: Unit,
  densityGPerMl?: number,
): number {
  const fromType = getMeasurementType(fromUnit);
  const toType = getMeasurementType(toUnit);

  if (fromType === toType) {
    return fromCanonical(toCanonical(amount, fromUnit), toUnit);
  }

  if (fromType === "mass" && toType === "volume") {
    if (!densityGPerMl || densityGPerMl <= 0) {
      throw new Error(
        `Cannot convert ${fromUnit} → ${toUnit} without a positive density`,
      );
    }
    const grams = toCanonical(amount, fromUnit);
    const ml = grams / densityGPerMl;
    return fromCanonical(ml, toUnit);
  }

  if (fromType === "volume" && toType === "mass") {
    if (!densityGPerMl || densityGPerMl <= 0) {
      throw new Error(
        `Cannot convert ${fromUnit} → ${toUnit} without a positive density`,
      );
    }
    const ml = toCanonical(amount, fromUnit);
    const grams = ml * densityGPerMl;
    return fromCanonical(grams, toUnit);
  }

  throw new Error(`Incompatible units: ${fromUnit} → ${toUnit}`);
}

const UNIT_LABEL_EN: Record<Unit, { short: string; long: string }> = {
  g: { short: "g", long: "grams" },
  kg: { short: "kg", long: "kilograms" },
  oz: { short: "oz", long: "ounces" },
  lb: { short: "lb", long: "pounds" },
  ml: { short: "ml", long: "milliliters" },
  l: { short: "l", long: "liters" },
  floz: { short: "fl oz", long: "fluid ounces" },
  tsp: { short: "tsp", long: "teaspoons" },
  tbsp: { short: "tbsp", long: "tablespoons" },
  cup: { short: "cup", long: "cups" },
  cm: { short: "cm", long: "centimeters" },
  m: { short: "m", long: "meters" },
  piece: { short: "pc", long: "pieces" },
};

const UNIT_LABEL_ES: Record<Unit, { short: string; long: string }> = {
  g: { short: "g", long: "gramos" },
  kg: { short: "kg", long: "kilogramos" },
  oz: { short: "oz", long: "onzas" },
  lb: { short: "lb", long: "libras" },
  ml: { short: "ml", long: "mililitros" },
  l: { short: "l", long: "litros" },
  floz: { short: "fl oz", long: "onzas fluidas" },
  tsp: { short: "cdta", long: "cucharaditas" },
  tbsp: { short: "cda", long: "cucharadas" },
  cup: { short: "taza", long: "tazas" },
  cm: { short: "cm", long: "centímetros" },
  m: { short: "m", long: "metros" },
  piece: { short: "u", long: "unidades" },
};

export function unitLabel(
  unit: Unit,
  locale: "en" | "es" = "es",
  variant: "short" | "long" = "short",
): string {
  const map = locale === "en" ? UNIT_LABEL_EN : UNIT_LABEL_ES;
  return map[unit][variant];
}

/**
 * Smart formatting: round mass/volume to 2 decimals, length to 1,
 * count to integer. Strips trailing zeros.
 */
export function formatAmount(amount: number, unit: Unit, locale: "en" | "es" = "es"): string {
  const type = getMeasurementType(unit);
  let decimals = 2;
  if (type === "length") decimals = 1;
  if (type === "count") decimals = 0;
  if (type === "mass" && (unit === "kg" || unit === "lb")) decimals = 3;
  if (type === "volume" && unit === "l") decimals = 3;

  const rounded = Number(amount.toFixed(decimals));
  const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-AR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
  return `${formatter.format(rounded)} ${unitLabel(unit, locale, "short")}`;
}
