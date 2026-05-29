import { createServiceClient } from "@/lib/supabase/service";
import { Link } from "@/lib/i18n/routing";
import { setRequestLocale } from "next-intl/server";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const actionFilter = (sp.action ?? "").trim();

  const service = createServiceClient();

  let query = service
    .from("admin_audit_log")
    .select("id, admin_id, action, target_user_id, details, created_at, ip_address", { count: "exact" });

  if (actionFilter) query = query.eq("action", actionFilter);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: rows = [], count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  // Resolve admin and target usernames
  const userIds = new Set<string>();
  for (const r of rows ?? []) {
    if (r.admin_id) userIds.add(r.admin_id);
    if (r.target_user_id) userIds.add(r.target_user_id);
  }
  const usernameMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profiles = [] } = await service
      .from("profiles")
      .select("id, username")
      .in("id", Array.from(userIds));
    for (const p of profiles ?? []) {
      if (p.username) usernameMap.set(p.id, p.username);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className="serif" style={{ fontSize: 32, margin: 0, color: "var(--ink)" }}>
          Auditoría
        </h1>
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {count ?? 0} acciones
        </span>
      </div>

      <form method="get" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          name="action"
          defaultValue={actionFilter}
          placeholder="Filtrar por acción (override_limit, change_plan, …)"
          className="input"
          style={{ maxWidth: 360 }}
        />
        {actionFilter && (
          <Link href="/admin/audit" className="btn btn-sm btn-ghost">
            limpiar
          </Link>
        )}
      </form>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--rule)" }}>
              <Th>Fecha</Th>
              <Th>Admin</Th>
              <Th>Acción</Th>
              <Th>Usuario afectado</Th>
              <Th>Detalle</Th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                <Td className="mono" style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                  {new Date(r.created_at).toLocaleString(locale === "en" ? "en-US" : "es-AR")}
                </Td>
                <Td>
                  <span className="mono" style={{ fontSize: 11 }}>
                    {usernameMap.get(r.admin_id) ? `@${usernameMap.get(r.admin_id)}` : r.admin_id.slice(0, 8)}
                  </span>
                </Td>
                <Td>
                  <strong>{r.action}</strong>
                </Td>
                <Td>
                  {r.target_user_id ? (
                    <Link
                      href={`/admin/users/${r.target_user_id}`}
                      className="mono"
                      style={{ fontSize: 11, color: "var(--accent-2)", textDecoration: "none" }}
                    >
                      {usernameMap.get(r.target_user_id) ? `@${usernameMap.get(r.target_user_id)}` : r.target_user_id.slice(0, 8)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="mono" style={{ fontSize: 10, color: "var(--ink-3)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {JSON.stringify(r.details).slice(0, 160)}
                </Td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <Td colSpan={5} style={{ textAlign: "center", color: "var(--ink-3)", padding: "32px 16px" }}>
                  Sin acciones registradas.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mono" style={{ fontSize: 12, marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
          {page > 1 && (
            <Link
              href={`/admin/audit?action=${encodeURIComponent(actionFilter)}&page=${page - 1}`}
              className="btn btn-sm btn-ghost"
            >
              ← Anterior
            </Link>
          )}
          <span style={{ color: "var(--ink-3)" }}>
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/audit?action=${encodeURIComponent(actionFilter)}&page=${page + 1}`}
              className="btn btn-sm btn-ghost"
            >
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
      style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, color: "var(--ink-3)" }}
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
    <td className={className} colSpan={colSpan} style={{ padding: "8px 12px", ...style }}>
      {children}
    </td>
  );
}
