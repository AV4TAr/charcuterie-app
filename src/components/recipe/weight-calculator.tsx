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

interface WeightCalculatorProps {
  ingredients: RecipeIngredient[];
  initialMeatAmount?: number;
  initialMeatUnit?: MassUnit;
  locale?: "es" | "en";
  meatBaseGrams?: number;
}

export function WeightCalculator({
  ingredients,
  initialMeatAmount = 1,
  initialMeatUnit = "kg",
  locale = "es",
  meatBaseGrams,
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
    () => calculateIngredients(meatAmount, meatUnit, ingredientsWithChosenUnit, meatBaseGrams),
    [meatAmount, meatUnit, ingredientsWithChosenUnit, meatBaseGrams],
  );

  const totalGrams = calculated.reduce((s, c) => s + (c.amountGrams ?? 0), 0);
  const hasFixed = calculated.some((c) => c.mode === "absolute" && !c.scaleWithMeat);

  return (
    <div className="card p-0 overflow-hidden">
      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--rule)" }}>
        <h2 className="serif" style={{ fontSize: 20, margin: "0 0 4px", color: "var(--ink)" }}>
          {t("title")}
        </h2>
        <p style={{ fontSize: 12, color: "var(--ink-3)", margin: 0 }}>{t("demoIntro")}</p>
      </div>

      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-end gap-3">
          <div className="flex-1" style={{ maxWidth: 240 }}>
            <label className="label-lab" htmlFor="meat-amount">{t("meatWeight")}</label>
            <input
              id="meat-amount"
              type="number"
              min={0}
              step={0.001}
              value={meatAmount}
              onChange={(e) => setMeatAmount(Number(e.target.value))}
              className="input-lab"
            />
          </div>
          <div>
            <label className="label-lab sr-only" htmlFor="meat-unit">{t("meatWeight")}</label>
            <select
              id="meat-unit"
              value={meatUnit}
              onChange={(e) => setMeatUnit(e.target.value as MassUnit)}
              className="select-lab"
            >
              {MASS_UNITS.map((u) => (
                <option key={u} value={u}>
                  {unitLabel(u, locale, "short")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--rule)", background: "var(--bg-2)" }}>
            <th className="px-4 py-2 text-left eyebrow" style={{ fontWeight: 500 }}>{t("ingredient")}</th>
            <th className="px-4 py-2 text-right eyebrow" style={{ fontWeight: 500 }}>{t("amount")}</th>
            <th className="px-4 py-2 text-left eyebrow" style={{ fontWeight: 500, width: 128 }}>
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
              <tr key={row.id} style={{ borderTop: "1px solid var(--rule-soft)" }}>
                <td className="px-4 py-2">
                  <div style={{ fontWeight: 500, color: "var(--ink)", fontSize: 13 }}>
                    {row.name}
                    {row.mode === "absolute" && !row.scaleWithMeat && (
                      <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 4 }}>*</span>
                    )}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                    {row.mode === "percent"
                      ? `${Number((row.percentOfMeat ?? 0).toFixed(2))}% ${t("percentMode").toLowerCase()}`
                      : t("absoluteMode")}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="mono tabular" style={{ color: "var(--ink)", fontWeight: 600, fontSize: 14 }}>
                    {formatAmount(row.amountInDisplayUnit, row.displayUnit, locale)}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={row.displayUnit}
                    onChange={(e) =>
                      setPerRowUnit((prev) => ({
                        ...prev,
                        [row.id]: e.target.value as Unit,
                      }))
                    }
                    className="select-lab"
                    style={{ height: 30, fontSize: 11, width: "100%" }}
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {unitLabel(u, locale, "short")}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "1px solid var(--rule)", background: "var(--bg-2)" }}>
            <td className="px-4 py-2" style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{t("totalMass")}</td>
            <td className="px-4 py-2 text-right mono tabular" style={{ fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>
              {formatAmount(totalGrams, "g", locale)}
            </td>
            <td />
          </tr>
          {hasFixed && (
            <tr>
              <td colSpan={3} className="px-4 py-2 mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                {locale === "es"
                  ? "* cantidad fija — no varía con el peso de carne"
                  : "* fixed amount — does not scale with meat weight"}
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
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
