"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { toCanonical, unitsForType, MASS_UNITS, VOLUME_UNITS, LENGTH_UNITS, COUNT_UNITS, type Unit, type MeasurementType } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
  const isEditing = !!editing;

  const firstIng = ingredients[0];
  const defaultUnit = firstIng ? unitsForType(firstIng.measurement_type)[0] : "g";

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<RecipeFormValues>({
      defaultValues: { ...EMPTY_DEFAULTS, ...initialValues, changeNote: isEditing ? "" : (initialValues?.changeNote ?? "") },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "rows" });
  const rows = watch("rows");

  function getIngredient(id: string) {
    return ingredients.find((i) => i.id === id);
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
      <div className="space-y-2">
        <Label htmlFor="title">{t("title")} *</Label>
        <Input
          id="title"
          {...register("title", { required: true })}
          placeholder={t("titlePlaceholder")}
          className={errors.title ? "border-red-500" : ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <textarea
          id="description"
          {...register("description")}
          placeholder={t("descriptionPlaceholder")}
          rows={2}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      <div className="flex gap-6">
        <div className="space-y-2">
          <Label htmlFor="visibility">{t("visibility")}</Label>
          <Select id="visibility" {...register("visibility")} className="w-36">
            <option value="private">{t("private")}</option>
            <option value="public">{t("public")}</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("meatBase")}</Label>
          <div className="flex gap-2">
            <Input type="number" step="0.001" min="0.001" {...register("meatBaseValue")} className="w-24" />
            <Select {...register("meatBaseUnit")} className="w-20">
              {MASS_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t("ingredients")}</Label>
        {fields.map((field, index) => {
          const row = rows[index];
          const ing = row ? getIngredient(row.ingredientId) : null;
          const mode = row?.mode ?? "percent";

          return (
            <div key={field.id} className="flex flex-wrap gap-2 items-end rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex-1 min-w-[160px] space-y-1">
                <span className="text-xs text-zinc-500">{t("selectIngredient")}</span>
                <Controller
                  control={control}
                  name={`rows.${index}.ingredientId`}
                  render={({ field: f }) => (
                    <Select
                      {...f}
                      className="w-full"
                      onChange={(e) => {
                        f.onChange(e);
                        const ing2 = getIngredient(e.target.value);
                        const currentMode = rows[index]?.mode ?? "percent";
                        if (ing2 && currentMode === "percent") {
                          setValue(`rows.${index}.displayUnit`, unitsForType(ing2.measurement_type)[0]);
                        }
                      }}
                    >
                      {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-500">{t("mode")}</span>
                <Controller
                  control={control}
                  name={`rows.${index}.mode`}
                  render={({ field: f }) => (
                    <Select
                      {...f}
                      className="w-32"
                      onChange={(e) => {
                        f.onChange(e);
                        if (e.target.value === "percent" && ing) {
                          setValue(`rows.${index}.displayUnit`, unitsForType(ing.measurement_type)[0]);
                        }
                      }}
                    >
                      <option value="percent">{t("percentMode")}</option>
                      <option value="absolute">{t("absoluteMode")}</option>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1 w-20">
                <span className="text-xs text-zinc-500">{t("value")}</span>
                <Input type="number" step="0.01" min="0" {...register(`rows.${index}.value`)} />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-500">{t("unit")}</span>
                <Select {...register(`rows.${index}.displayUnit`)} className="w-24">
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
                </Select>
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="text-zinc-600 hover:text-red-400 transition text-xl leading-none mb-1"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          );
        })}
        <Button type="button" variant="outline" onClick={addRow} className="w-full">
          {t("addIngredient")}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="changeNote">
          {t("changeNote")}{isEditing ? " *" : ""}
        </Label>
        <Input
          id="changeNote"
          {...register("changeNote", { required: isEditing })}
          placeholder={isEditing ? t("changeNoteRequired") : t("changeNotePlaceholder")}
          className={errors.changeNote ? "border-red-500" : ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">{t("instructions")}</Label>
        <textarea
          id="instructions"
          {...register("instructions")}
          placeholder={t("instructionsPlaceholder")}
          rows={4}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      {saveError && <p className="text-sm text-red-400">{saveError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? t("saving") : isEditing ? t("saveVersion") : t("save")}
      </Button>
    </form>
  );
}
