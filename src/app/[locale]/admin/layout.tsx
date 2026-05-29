import { notFound } from "next/navigation";
import { redirect, Link } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/config";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale: locale as Locale });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user!.id)
    .single();

  if (!profile?.is_superadmin) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Admin banner */}
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--accent)",
          borderRadius: 8,
          padding: "10px 16px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span className="stamp" style={{ background: "var(--accent)", color: "white" }}>
          ADMIN
        </span>
        <span style={{ fontSize: 13, color: "var(--ink-2)", flex: 1 }}>
          Modo administrador — todas las acciones quedan registradas en el log de auditoría.
        </span>
      </div>

      {/* Sub-nav */}
      <nav
        style={{
          display: "flex",
          gap: 20,
          borderBottom: "1px solid var(--rule)",
          marginBottom: 32,
          paddingBottom: 1,
        }}
      >
        <AdminTab href="/admin" label="Dashboard" />
        <AdminTab href="/admin/users" label="Usuarios" />
        <AdminTab href="/admin/audit" label="Auditoría" />
      </nav>

      {children}
    </div>
  );
}

function AdminTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mono"
      style={{
        textDecoration: "none",
        color: "var(--ink-2)",
        padding: "10px 0",
        fontSize: 12,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderBottom: "2px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}
    </Link>
  );
}
