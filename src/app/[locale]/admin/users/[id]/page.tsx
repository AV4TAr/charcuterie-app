import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { OverrideForm } from "./override-form";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("id, username, display_name, bio, created_at, is_superadmin")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const { data: authUser } = await service.auth.admin.getUserById(id);
  const email = authUser?.user?.email ?? "—";
  const lastSignIn = authUser?.user?.last_sign_in_at ?? null;

  const [
    { count: totalRecipes },
    { count: publicRecipes },
    { count: archivedRecipes },
    { count: favoritesGiven },
    { count: favoritesReceived },
    { count: commentsAuthored },
    { count: hasApiKey },
    { data: override },
    { data: auditRows = [] },
  ] = await Promise.all([
    service.from("recipes").select("id", { count: "exact", head: true }).eq("owner_id", id),
    service.from("recipes").select("id", { count: "exact", head: true }).eq("owner_id", id).eq("visibility", "public"),
    service.from("recipes").select("id", { count: "exact", head: true }).eq("owner_id", id).not("archived_at", "is", null),
    service.from("favorites").select("recipe_id", { count: "exact", head: true }).eq("user_id", id),
    service
      .from("favorites")
      .select("recipe_id, recipes!inner(owner_id)", { count: "exact", head: true })
      .eq("recipes.owner_id", id),
    service.from("comments").select("id", { count: "exact", head: true }).eq("author_id", id),
    service.from("user_api_keys").select("user_id", { count: "exact", head: true }).eq("user_id", id),
    service.from("user_plan_overrides").select("*").eq("user_id", id).maybeSingle(),
    service
      .from("admin_audit_log")
      .select("id, action, details, created_at, admin_id")
      .eq("target_user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/users"
          className="mono"
          style={{ fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}
        >
          ← Volver a usuarios
        </Link>
        <h1 className="serif" style={{ fontSize: 32, margin: "8px 0 4px", color: "var(--ink)" }}>
          @{profile.username ?? "—"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0 }}>
          {profile.display_name ?? "—"}
        </p>
      </div>

      <Section title="Cuenta">
        <KV k="ID" v={<span className="mono" style={{ fontSize: 11 }}>{profile.id}</span>} />
        <KV k="Email" v={email} />
        <KV k="Bio" v={profile.bio ?? "—"} />
        <KV k="Creado" v={new Date(profile.created_at).toLocaleString(locale === "en" ? "en-US" : "es-AR")} />
        <KV k="Último login" v={lastSignIn ? new Date(lastSignIn).toLocaleString(locale === "en" ? "en-US" : "es-AR") : "—"} />
        <KV k="Superadmin" v={profile.is_superadmin ? "✓" : "—"} />
        <KV k="Clave de Anthropic" v={(hasApiKey ?? 0) > 0 ? "✓ configurada" : "—"} />
      </Section>

      <Section title="Actividad">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          <Stat label="Recetas totales" value={totalRecipes ?? 0} />
          <Stat label="Públicas" value={publicRecipes ?? 0} />
          <Stat label="Archivadas" value={archivedRecipes ?? 0} />
          <Stat label="Favoritos dados" value={favoritesGiven ?? 0} />
          <Stat label="Favoritos recibidos" value={favoritesReceived ?? 0} />
          <Stat label="Comentarios" value={commentsAuthored ?? 0} />
        </div>
      </Section>

      <Section title="Override de plan">
        <OverrideForm
          userId={profile.id}
          initial={
            override
              ? {
                  plan: override.plan,
                  trialLimit: override.trial_limit,
                  analysesLimit: override.analyses_limit,
                  importsLimit: override.imports_limit,
                  chatDailyLimit: override.chat_daily_limit,
                  note: override.note,
                }
              : null
          }
        />
      </Section>

      <Section title="Auditoría (últimas 20)">
        {(auditRows ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
            Sin acciones registradas sobre este usuario.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(auditRows ?? []).map((a) => (
              <li
                key={a.id}
                style={{
                  borderBottom: "1px solid var(--rule)",
                  padding: "10px 0",
                  fontSize: 13,
                }}
              >
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {new Date(a.created_at).toLocaleString(locale === "en" ? "en-US" : "es-AR")} · admin {a.admin_id.slice(0, 8)}
                </div>
                <div>
                  <strong>{a.action}</strong>{" "}
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {JSON.stringify(a.details).slice(0, 120)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="eyebrow" style={{ marginBottom: 12, borderBottom: "1px solid var(--rule)", paddingBottom: 8 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, padding: "6px 0", fontSize: 13 }}>
      <div className="mono" style={{ minWidth: 160, color: "var(--ink-3)", fontSize: 11 }}>
        {k}
      </div>
      <div style={{ flex: 1, color: "var(--ink)" }}>{v}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 4, fontSize: 9 }}>{label}</div>
      <div className="serif" style={{ fontSize: 24, lineHeight: 1, color: "var(--accent-2)" }}>{value}</div>
    </div>
  );
}
