import { createServiceClient } from "@/lib/supabase/service";
import { setRequestLocale } from "next-intl/server";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const service = createServiceClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newUsers7d },
    { count: totalRecipes },
    { count: publicRecipes },
    { count: archivedRecipes },
    { count: totalFavorites },
    { count: totalComments },
    { count: totalForks },
    { count: openProposals },
    { count: usersWithApiKey },
    { count: usersWithOverride },
    { count: superadmins },
  ] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }),
    service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    service.from("recipes").select("id", { count: "exact", head: true }),
    service.from("recipes").select("id", { count: "exact", head: true }).eq("visibility", "public"),
    service.from("recipes").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
    service.from("favorites").select("recipe_id", { count: "exact", head: true }),
    service.from("comments").select("id", { count: "exact", head: true }),
    service.from("recipes").select("id", { count: "exact", head: true }).not("forked_from_recipe_id", "is", null),
    service.from("proposals").select("id", { count: "exact", head: true }).eq("status", "open"),
    service.from("user_api_keys").select("user_id", { count: "exact", head: true }),
    service.from("user_plan_overrides").select("user_id", { count: "exact", head: true }),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("is_superadmin", true),
  ]);

  const stats: { label: string; value: number | null; hint?: string }[] = [
    { label: "Usuarios", value: totalUsers, hint: `+${newUsers7d ?? 0} últimos 7 días` },
    { label: "Con clave de Anthropic", value: usersWithApiKey, hint: "BYOK activos" },
    { label: "Con override", value: usersWithOverride },
    { label: "Superadmins", value: superadmins },
    { label: "Recetas totales", value: totalRecipes },
    { label: "Públicas", value: publicRecipes },
    { label: "Archivadas", value: archivedRecipes },
    { label: "Forks", value: totalForks },
    { label: "Favoritos", value: totalFavorites },
    { label: "Comentarios", value: totalComments },
    { label: "Proposals abiertos", value: openProposals },
  ];

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 32, margin: "0 0 24px", color: "var(--ink)" }}>
        Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="card"
            style={{ padding: 16 }}
          >
            <div className="eyebrow" style={{ marginBottom: 6 }}>{s.label}</div>
            <div className="serif" style={{ fontSize: 36, lineHeight: 1, color: "var(--accent-2)" }}>
              {s.value ?? "—"}
            </div>
            {s.hint && (
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6 }}>
                {s.hint}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
