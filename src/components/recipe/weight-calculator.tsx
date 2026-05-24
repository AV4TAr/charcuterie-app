"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  calculateIngredients,
  type RecipeIngredient,
} from "@/lib/recipes/calculator";
import {
  MASS_UNITS,
  formatAmount,
  unitLabel,
  type MassUnit,
  type Unit,
} from "@/lib/units";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface WeightCalculatorProps {
  ingredients: RecipeIngredient[];
  initialMeatAmount?: number;
  initialMeatUnit?: MassUnit;
  locale?: "es" | "en";
}

export function WeightCalculator({
  ingredients,
  initialMeatAmount = 1,
  initialMeatUnit = "kg",
  locale = "es",
}: WeightCalculatorProps) {
  const t = useTranslations("calculator");
  const [meatAmount, setMeatAmount] = useState(initialMeatAmount);
  const [meatUnit, setMeatUnit] = useState<MassUnit>(initialMeatUnit);
  const [perRowUnit, setPerRowUnit] = useState<Record<string, Unit>>({});

  const ingredientsWithChosenUnit = useMemo(
    () =>
      ingredients.map((ing) => ({
        ...ing,
        displayUnit: perRowUnit[ing.id] ?? ing.displayUnit,
      })),
    [ingredients, perRowUnit],
  );

  const calculated = useMemo(
    () => calculateIngredients(meatAmount, meatUnit, ingredientsWithChosenUnit),
    [meatAmount, meatUnit, ingredientsWithChosenUnit],
  );

  const totalGrams = calculated.reduce((s, c) => s + (c.amountGrams ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("demoIntro")}</CardDescription>
      </CardHeader>

      <div className="mb-6 grid grid-cols-[1fr_auto] gap-3 items-end max-w-md">
        <div>
          <Label htmlFor="meat-amount">{t("meatWeight")}</Label>
          <Input
            id="meat-amount"
            type="number"
            min={0}
            step={0.001}
            value={meatAmount}
            onChange={(e) => setMeatAmount(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="meat-unit" className="sr-only">
            {t("meatWeight")}
          </Label>
          <Select
            id="meat-unit"
            value={meatUnit}
            onChange={(e) => setMeatUnit(e.target.value as MassUnit)}
            className="mt-1"
          >
            {MASS_UNITS.map((u) => (
              <option key={u} value={u}>
                {unitLabel(u, locale, "short")}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("ingredient")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("amount")}</th>
              <th className="px-3 py-2 text-left font-medium w-32">
                {unitLabel("g", locale, "long")}
              </th>
            </tr>
          </thead>
          <tbody>
            {calculated.map((row) => {
              const sourceIng = ingredients.find((i) => i.id === row.id);
              if (!sourceIng) return null;
              const unitOptions = unitOptionsFor(sourceIng.measurementType);
              return (
                <tr key={row.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-100">{row.name}</div>
                    <div className="text-xs text-zinc-500">
                      {row.mode === "percent"
                        ? `${row.percentOfMeat}% ${t("percentMode").toLowerCase()}`
                        : t("absoluteMode")}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="tabular-nums text-zinc-50 font-semibold">
                      {formatAmount(row.amountInDisplayUnit, row.displayUnit, locale)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.displayUnit}
                      onChange={(e) =>
                        setPerRowUnit((prev) => ({
                          ...prev,
                          [row.id]: e.target.value as Unit,
                        }))
                      }
                      className="h-8 text-xs w-full"
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>
                          {unitLabel(u, locale, "short")}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-700 bg-zinc-900/50">
              <td className="px-3 py-2 font-semibold text-zinc-200">{t("totalMass")}</td>
              <td className="px-3 py-2 text-right font-semibold text-amber-300 tabular-nums">
                {formatAmount(totalGrams, "g", locale)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function unitOptionsFor(type: RecipeIngredient["measurementType"]): Unit[] {
  switch (type) {
    case "mass":
      return ["g", "kg", "oz", "lb"];
    case "volume":
      return ["ml", "l", "floz", "tsp", "tbsp", "cup"];
    case "length":
      return ["cm", "m"];
    case "count":
      return ["piece"];
  }
}
