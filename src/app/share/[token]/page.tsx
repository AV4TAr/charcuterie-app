import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { WeightCalculator } from "@/components/recipe/weight-calculator";
import { fromCanonical } from "@/lib/units";
import type { RecipeIngredient } from "@/lib/recipes/calculator";
import type { MassUnit, Unit } from "@/lib/units";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Validate token
  const { data: tokenRow } = await supabase
    .from("recipe_share_tokens")
    .select("recipe_id, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked_at) notFound();

  // Load recipe (bypasses RLS via service role)
  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, title, description, current_version_id, profiles!owner_id(username, display_name)")
    .eq("id", tokenRow.recipe_id)
    .single();

  if (!recipe || !recipe.current_version_id) notFound();

  const { data: version } = await supabase
    .from("recipe_versions")
    .select("id, version_number, meat_base_weight_grams, meat_base_display_unit, instructions")
    .eq("id", recipe.current_version_id)
    .single();

  if (!version) notFound();

  const { data: rows = [] } = await supabase
    .from("recipe_version_ingredients")
    .select("id, mode, percent_of_meat, amount_canonical, display_unit, sort_order, notes, scale_with_meat, ingredients(id, name, name_es, name_en, measurement_type, default_density_g_per_ml)")
    .eq("version_id", version.id)
    .order("sort_order");

  const ingredients: RecipeIngredient[] = (rows ?? []).map((row) => {
    const ing = row.ingredients as unknown as { id: string; name: string; name_es: string | null; name_en: string | null; measurement_type: string; default_density_g_per_ml: number | null } | null;
    return {
      id: row.id,
      name: ing?.name ?? "?",
      measurementType: (ing?.measurement_type ?? "mass") as RecipeIngredient["measurementType"],
      defaultDensityGPerMl: ing?.default_density_g_per_ml ?? null,
      mode: row.mode as "percent" | "absolute",
      percentOfMeat: row.percent_of_meat != null ? Number((Number(row.percent_of_meat) * 100).toFixed(2)) : null,
      amountCanonical: row.amount_canonical != null ? Number(row.amount_canonical) : null,
      displayUnit: row.display_unit as Unit,
      notes: row.notes ?? null,
      sortOrder: row.sort_order,
      scaleWithMeat: row.scale_with_meat ?? true,
    };
  });

  const meatUnit = (version.meat_base_display_unit ?? "kg") as MassUnit;
  const initialMeatAmount = fromCanonical(Number(version.meat_base_weight_grams), meatUnit);
  const owner = recipe.profiles as unknown as { username: string; display_name: string | null } | null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "0 0 64px" }}>
      {/* Banner */}
      <div style={{
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--rule)",
        padding: "10px 20px",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>
          Chorizo Lab
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          Receta compartida por {owner?.display_name ?? owner?.username ?? "un usuario"}
        </span>
        <a
          href="/es/login"
          className="btn btn-sm btn-primary"
          style={{ marginLeft: "auto", fontSize: 11 }}
        >
          Registrate para guardar →
        </a>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 672, margin: "0 auto", padding: "40px 20px" }} className="space-y-8">
        <div>
          <h1 className="serif" style={{ fontSize: 36, margin: "0 0 8px", lineHeight: 1.05, color: "var(--ink)" }}>
            {recipe.title}
          </h1>
          {recipe.description && (
            <p style={{ fontSize: 15, color: "var(--ink-2)", margin: "0 0 8px", lineHeight: 1.45 }}>
              {recipe.description}
            </p>
          )}
          <span className="tag mono">v{version.version_number}</span>
        </div>

        {ingredients.length > 0 && (
          <WeightCalculator
            ingredients={ingredients}
            initialMeatAmount={initialMeatAmount}
            initialMeatUnit={meatUnit}
            locale="es"
            meatBaseGrams={Number(version.meat_base_weight_grams)}
          />
        )}

        {version.instructions && (
          <div>
            <h2 className="eyebrow" style={{ marginBottom: 12, borderBottom: "1px solid var(--rule)", paddingBottom: 8 }}>
              Preparación
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-2)", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>
              {version.instructions}
            </p>
          </div>
        )}

        {/* Login CTA */}
        <div style={{
          border: "1px solid var(--rule)",
          borderRadius: 12,
          padding: "24px",
          textAlign: "center",
          background: "var(--bg-2)",
        }}>
          <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "0 0 16px", lineHeight: 1.5 }}>
            ¿Querés guardar esta receta, comentar o crear la tuya?
          </p>
          <a href="/es/login" className="btn btn-lg btn-primary">
            Crear cuenta gratis
          </a>
        </div>
      </div>
    </div>
  );
}
