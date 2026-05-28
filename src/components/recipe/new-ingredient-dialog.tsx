"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { MeasurementType } from "@/lib/units";

export type NewIngredient = {
  id: string;
  name: string;
  measurement_type: MeasurementType;
  default_density_g_per_ml: number | null;
  category: string;
};

type Props = {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (ing: NewIngredient) => void;
};

const CATEGORIES = ["meat", "spice", "cure", "casing", "liquid", "herb", "other"] as const;
const TYPES: MeasurementType[] = ["mass", "volume", "length", "count"];

export function NewIngredientDialog({ open, initialName, onClose, onCreated }: Props) {
  const t = useTranslations("recipe");
  const [name, setName] = useState(initialName ?? "");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("spice");
  const [type, setType] = useState<MeasurementType>("mass");
  const [density, setDensity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName ?? "");
      setError(null);
      setSubmitting(false);
    }
  }, [open, initialName]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const densityNum =
      (type === "volume" || type === "mass") && density.trim() ? Number(density) : null;

    const { data, error: insErr } = await supabase
      .from("ingredients")
      .insert({
        name: trimmed,
        category,
        measurement_type: type,
        default_density_g_per_ml: densityNum,
      })
      .select("id, name, measurement_type, default_density_g_per_ml, category")
      .single();

    setSubmitting(false);

    if (insErr) {
      if (insErr.code === "23505") setError(t("duplicateName"));
      else setError(insErr.message);
      return;
    }

    if (data) {
      onCreated({
        id: data.id,
        name: data.name,
        measurement_type: data.measurement_type as MeasurementType,
        default_density_g_per_ml: data.default_density_g_per_ml,
        category: data.category,
      });
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in oklab, var(--ink) 40%, transparent)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "100%",
          maxWidth: 480,
          padding: 0,
          background: "var(--paper)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--rule)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span className="serif" style={{ fontSize: 20, color: "var(--ink)" }}>
            {t("newIngredient")}
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close"
            style={{ borderColor: "transparent", padding: "2px 8px" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--ink-3)", margin: 0, lineHeight: 1.5 }}>
            {t("newIngredientHint")}
          </p>

          <div>
            <label className="label-lab">{t("ingredientName")} *</label>
            <input
              autoFocus
              className="input-lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("ingredientNamePlaceholder")}
              required
              style={{ marginTop: 6 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label-lab">{t("ingredientCategory")}</label>
              <select
                className="select-lab"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
                style={{ marginTop: 6, width: "100%" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category${c.charAt(0).toUpperCase() + c.slice(1)}` as "categorySpice")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-lab">{t("ingredientType")}</label>
              <select
                className="select-lab"
                value={type}
                onChange={(e) => setType(e.target.value as MeasurementType)}
                style={{ marginTop: 6, width: "100%" }}
              >
                {TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`type${tp.charAt(0).toUpperCase() + tp.slice(1)}` as "typeMass")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(type === "volume" || type === "mass") && (
            <div>
              <label className="label-lab">{t("ingredientDensity")}</label>
              <input
                className="input-lab"
                type="number"
                step="0.01"
                min="0.1"
                max="2"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                placeholder={type === "mass" ? "Ej. 0.45 (pimentón)" : "1.00"}
                style={{ marginTop: 6, width: 200 }}
              />
              <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>
                {type === "mass" ? t("ingredientDensityHintMass") : t("ingredientDensityHint")}
              </p>
            </div>
          )}

          {error && <p style={{ fontSize: 13, color: "var(--warn)", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost" disabled={submitting}>
              {t("cancel")}
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={submitting || !name.trim()}>
              {submitting ? t("creating") : t("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
