import { createServiceClient } from "@/lib/supabase/service";
import { Link } from "@/lib/i18n/routing";
import { setRequestLocale } from "next-intl/server";

const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim();

  const service = createServiceClient();

  let query = service
    .from("profiles")
    .select("id, username, display_name, created_at, is_superadmin", { count: "exact" });

  if (q) {
    query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: profiles = [], count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  // Fetch emails from auth.users (service role only)
  const profileIds = (profiles ?? []).map((p) => p.id);
  const emailMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: usersData } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (usersData?.users) {
      for (const u of usersData.users) {
        if (profileIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
      }
    }
  }

  // Mark which users have an override
  let overrideIds = new Set<string>();
  if (profileIds.length > 0) {
    const { data: overrides = [] } = await service
      .from("user_plan_overrides")
      .select("user_id")
      .in("user_id", profileIds);
    overrideIds = new Set((overrides ?? []).map((o) => o.user_id));
  }

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className="serif" style={{ fontSize: 32, margin: 0, color: "var(--ink)" }}>
          Usuarios
        </h1>
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {count ?? 0} en total
        </span>
      </div>

      <form method="get" style={{ marginBottom: 16 }}>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por username o display name…"
          className="input"
          style={{ maxWidth: 320 }}
        />
      </form>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--rule)" }}>
              <Th>Username</Th>
              <Th>Email</Th>
              <Th>Display</Th>
              <Th>Creado</Th>
              <Th>Override</Th>
              <Th>Admin</Th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => {
              const email = emailMap.get(p.id) ?? "—";
              const hasOverride = overrideIds.has(p.id);
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: "1px solid var(--rule)" }}
                >
                  <Td>
                    <Link
                      href={`/admin/users/${p.id}`}
                      style={{ color: "var(--accent-2)", textDecoration: "none" }}
                    >
                      @{p.username ?? "—"}
                    </Link>
                  </Td>
                  <Td>{email}</Td>
                  <Td>{p.display_name ?? "—"}</Td>
                  <Td className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {new Date(p.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-AR")}
                  </Td>
                  <Td>{hasOverride ? "✓" : ""}</Td>
                  <Td>{p.is_superadmin ? "✓" : ""}</Td>
                </tr>
              );
            })}
            {(profiles ?? []).length === 0 && (
              <tr>
                <Td colSpan={6} style={{ textAlign: "center", color: "var(--ink-3)", padding: "32px 16px" }}>
                  Sin resultados
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mono" style={{ fontSize: 12, marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
          {page > 1 && (
            <Link href={`/admin/users?q=${encodeURIComponent(q)}&page=${page - 1}`} className="btn btn-sm btn-ghost">
              ← Anterior
            </Link>
          )}
          <span style={{ color: "var(--ink-3)" }}>
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/users?q=${encodeURIComponent(q)}&page=${page + 1}`} className="btn btn-sm btn-ghost">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="eyebrow"
      style={{
        textAlign: "left",
        padding: "8px 12px",
        fontSize: 10,
        color: "var(--ink-3)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  colSpan,
  className,
  style,
}: {
  children: React.ReactNode;
  colSpan?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td className={className} colSpan={colSpan} style={{ padding: "10px 12px", ...style }}>
      {children}
    </td>
  );
}
