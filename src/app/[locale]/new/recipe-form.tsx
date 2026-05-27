"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { toCanonical, unitsForType, MASS_UNITS, VOLUME_UNITS, LENGTH_UNITS, COUNT_UNITS, type Unit, type MeasurementType } from "@/lib/units";
import { NewIngredientDialog, type NewIngredient } from "@/components/recipe/new-ingredient-dialog";

type DbIngredient = {
  id: string;
  name: string;
  measurement_type: MeasurementType;
  default_density_g_per_ml: number | null;
  category: string;
};

type Row = {
  ingredientId: string;
  mode: "percent" | "absolute";
  value: string;
  displayUnit: string;
};

export type RecipeFormValues = {
  title: string;
  description: string;
  visibility: "public" | "private";
  meatBaseValue: string;
  meatBaseUnit: "g" | "kg" | "oz" | "lb";
  changeNote: string;
  instructions: string;
  rows: Row[];
};

export type EditingContext = {
  recipeId: string;
  currentVersionNumber: number;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const EMPTY_DEFAULTS: RecipeFormValues = {
  title: "",
  description: "",
  visibility: "private",
  meatBaseValue: "1",
  meatBaseUnit: "kg",
  changeNote: "",
  instructions: "",
  rows: [],
};

export function RecipeForm({
  locale,
  ingredients,
  userId,
  editing,
  initialValues,
}: {
  locale: string;
  ingredients: DbIngredient[];
  userId: string;
  editing?: EditingContext;
  initialValues?: Partial<RecipeFormValues>;
}) {
  const t = useTranslations("recipe");
  const tUnits = useTranslations("units");
  const router = useRouter();
  const [saveError, setSaveError] = useState("");
  const [catalog, setCatalog] = useState<DbIngredient[]>(ingredients);
  const [dialogRowIndex, setDialogRowIndex] = useState<number | null>(null);
  const isEditing = !!editing;

  const firstIng = catalog[0];
  const defaultUnit = firstIng ? unitsForType(firstIng.measurement_type)[0] : "g";

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<RecipeFormValues>({
      defaultValues: { ...EMPTY_DEFAULTS, ...initialValues, changeNote: isEditing ? "" : (initialValues?.changeNote ?? "") },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "rows" });
  const rows = watch("rows");

  function getIngredient(id: string) {
    return catalog.find((i) => i.id === id);
  }

  function handleIngredientCreated(ing: NewIngredient) {
    const updated: DbIngredient = {
      id: ing.id,
      name: ing.name,
      measurement_type: ing.measurement_type,
      default_density_g_per_ml: ing.default_density_g_per_ml,
      category: ing.category,
    };
    setCatalog((prev) => [...prev, updated].sort((a, b) => a.name.localeCompare(b.name)));
    if (dialogRowIndex !== null) {
      setValue(`rows.${dialogRowIndex}.ingredientId`, ing.id);
      setValue(`rows.${dialogRowIndex}.displayUnit`, unitsForType(ing.measurement_type)[0]);
    }
    setDialogRowIndex(null);
  }

  function addRow() {
    append({
      ingredientId: firstIng?.id ?? "",
      mode: "percent",
      value: "1",
      displayUnit: defaultUnit,
    });
  }

  async function onSubmit(values: RecipeFormValues) {
    setSaveError("");
    const supabase = createClient();

    let recipeId: string;
    let nextVersionNumber: number;

    if (isEditing && editing) {
      const { error: updateErr } = await supabase
        .from("recipes")
        .update({
          title: values.title.trim(),
          description: values.description.trim() || null,
          visibility: values.visibility,
        })
        .eq("id", editing.recipeId)
        .eq("owner_id", userId);

      if (updateErr) {
        setSaveError(updateErr.message);
        return;
      }
      recipeId = editing.recipeId;
      nextVersionNumber = editing.currentVersionNumber + 1;
    } else {
      const slug = slugify(values.title) + "-" + Math.random().toString(36).slice(2, 6);
      const { data: recipe, error: recipeErr } = await supabase
        .from("recipes")
        .insert({
          owner_id: userId,
          slug,
          title: values.title.trim(),
          description: values.description.trim() || null,
          visibility: values.visibility,
        })
        .select("id")
        .single();

      if (recipeErr || !recipe) {
        setSaveError(recipeErr?.message ?? "Failed to create recipe");
        return;
      }
      recipeId = recipe.id;
      nextVersionNumber = 1;
    }

    const meatGrams = toCanonical(Number(values.meatBaseValue) || 1000, values.meatBaseUnit);
    const { data: version, error: versionErr } = await supabase
      .from("recipe_versions")
      .insert({
        recipe_id: recipeId,
        version_number: nextVersionNumber,
        change_note: values.changeNote.trim() || null,
        instructions: values.instructions.trim() || null,
        meat_base_weight_grams: meatGrams,
        meat_base_display_unit: values.meatBaseUnit,
        created_by: userId,
      })
      .select("id")
      .single();

    if (versionErr || !version) {
      setSaveError(versionErr?.message ?? "Failed to create version");
      return;
    }

    await supabase.from("recipes").update({ current_version_id: version.id }).eq("id", recipeId);

    const validRows = values.rows.filter((r) => r.ingredientId && Number(r.value) > 0);
    if (validRows.length > 0) {
      const ingredientRows = validRows.map((r, i) => {
        const val = Number(r.value);
        const common = {
          version_id: version.id,
          ingredient_id: r.ingredientId,
          display_unit: r.displayUnit,
          sort_order: i,
        };
        if (r.mode === "percent") {
          return { ...common, mode: "percent" as const, percent_of_meat: val / 100, amount_canonical: null };
        }
        return {
          ...common,
          mode: "absolute" as const,
          amount_canonical: toCanonical(val, r.displayUnit as Unit),
          percent_of_meat: null,
        };
      });

      const { error: ingErr } = await supabase.from("recipe_version_ingredients").insert(ingredientRows);
      if (ingErr) {
        setSaveError(ingErr.message);
        return;
      }
    }

    router.push(`/r/${recipeId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="label-lab" htmlFor="title">{t("title")} *</label>
        <input
          id="title"
          {...register("title", { required: true })}
          placeholder={t("titlePlaceholder")}
          className={`input-lab${errors.title ? " err" : ""}`}
        />
      </div>

      <div>
        <label className="label-lab" htmlFor="description">{t("description")}</label>
        <textarea
          id="description"
          {...register("description")}
          placeholder={t("descriptionPlaceholder")}
          rows={2}
          className="textarea-lab"
        />
      </div>

      <div className="flex gap-6 flex-wrap">
        <div>
          <label className="label-lab" htmlFor="visibility">{t("visibility")}</label>
          <select id="visibility" {...register("visibility")} className="select-lab" style={{ width: 144 }}>
            <option value="private">{t("private")}</option>
            <option value="public">{t("public")}</option>
          </select>
        </div>
        <div>
          <label className="label-lab">{t("meatBase")}</label>
          <div className="flex gap-2">
            <input type="number" step="0.001" min="0.001" {...register("meatBaseValue")} className="input-lab" style={{ width: 96 }} />
            <select {...register("meatBaseUnit")} className="select-lab" style={{ width: 80 }}>
              {MASS_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="label-lab">{t("ingredients")}</label>
        {fields.map((field, index) => {
          const row = rows[index];
          const ing = row ? getIngredient(row.ingredientId) : null;
          const mode = row?.mode ?? "percent";

          return (
            <div
              key={field.id}
              className="flex flex-wrap gap-2 items-end p-3 rounded"
              style={{ border: "1px solid var(--rule)", background: "var(--bg-2)" }}
            >
              <div className="flex-1 min-w-[160px]">
                <span className="label-lab">{t("selectIngredient")}</span>
                <div className="flex gap-1">
                  <Controller
                    control={control}
                    name={`rows.${index}.ingredientId`}
                    render={({ field: f }) => (
                      <select
                        {...f}
                        className="select-lab"
                        style={{ flex: 1, minWidth: 0 }}
                        onChange={(e) => {
                          f.onChange(e);
                          const ing2 = getIngredient(e.target.value);
                          const currentMode = rows[index]?.mode ?? "percent";
                          if (ing2 && currentMode === "percent") {
                            setValue(`rows.${index}.displayUnit`, unitsForType(ing2.measurement_type)[0]);
                          }
                        }}
                      >
                        {catalog.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setDialogRowIndex(index)}
                    className="btn btn-sm btn-ghost"
                    title={t("newIngredient")}
                    style={{ padding: "0 10px", color: "var(--accent)", flexShrink: 0 }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <span className="label-lab">{t("mode")}</span>
                <Controller
                  control={control}
                  name={`rows.${index}.mode`}
                  render={({ field: f }) => (
                    <select
                      {...f}
                      className="select-lab"
                      style={{ width: 128 }}
                      onChange={(e) => {
                        f.onChange(e);
                        if (e.target.value === "percent" && ing) {
                          setValue(`rows.${index}.displayUnit`, unitsForType(ing.measurement_type)[0]);
                        }
                      }}
                    >
                      <option value="percent">{t("percentMode")}</option>
                      <option value="absolute">{t("absoluteMode")}</option>
                    </select>
                  )}
                />
              </div>

              <div style={{ width: 80 }}>
                <span className="label-lab">{t("value")}</span>
                <input type="number" step="0.01" min="0" {...register(`rows.${index}.value`)} className="input-lab" />
              </div>

              <div>
                <span className="label-lab">{t("unit")}</span>
                <select {...register(`rows.${index}.displayUnit`)} className="select-lab" style={{ width: 96 }}>
                  {mode === "percent" && ing ? (
                    unitsForType(ing.measurement_type).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))
                  ) : (
                    <>
                      <optgroup label={tUnits("mass")}>
                        {MASS_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </optgroup>
                      <optgroup label={tUnits("volume")}>
                        {VOLUME_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </optgroup>
                      <optgroup label={tUnits("length")}>
                        {LENGTH_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </optgroup>
                      <optgroup label={tUnits("count")}>
                        {COUNT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="btn btn-ghost btn-sm"
                aria-label="Remove"
                style={{ color: "var(--warn)", borderColor: "transparent" }}
              >
                ×
              </button>
            </div>
          );
        })}
        <button type="button" onClick={addRow} className="btn w-full" style={{ justifyContent: "center" }}>
          + {t("addIngredient")}
        </button>
      </div>

      <div>
        <label className="label-lab" htmlFor="changeNote">
          {t("changeNote")}{isEditing ? " *" : ""}
        </label>
        <input
          id="changeNote"
          {...register("changeNote", { required: isEditing })}
          placeholder={isEditing ? t("changeNoteRequired") : t("changeNotePlaceholder")}
          className={`input-lab${errors.changeNote ? " err" : ""}`}
        />
      </div>

      <div>
        <label className="label-lab" htmlFor="instructions">{t("instructions")}</label>
        <textarea
          id="instructions"
          {...register("instructions")}
          placeholder={t("instructionsPlaceholder")}
          rows={4}
          className="textarea-lab"
        />
      </div>

      {saveError && <p style={{ fontSize: 13, color: "var(--warn)" }}>{saveError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary btn-lg w-full"
        style={{ justifyContent: "center" }}
      >
        {isSubmitting ? t("saving") : isEditing ? t("saveVersion") : t("save")}
      </button>

      <NewIngredientDialog
        open={dialogRowIndex !== null}
        onClose={() => setDialogRowIndex(null)}
        onCreated={handleIngredientCreated}
      />
    </form>
  );
}
