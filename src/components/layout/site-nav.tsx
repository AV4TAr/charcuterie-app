import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";

export async function SiteNav() {
  const t = await getTranslations("nav");
  const tAuth = await getTranslations("auth");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mobileItems = user
    ? [
        { href: "/explore", label: t("explore") },
        { href: "/library", label: t("library") },
        { href: "/don-marco", label: t("donMarco"), badge: "✦ IA" },
        { href: "/settings", label: t("settings") },
      ]
    : [
        { href: "/explore", label: t("explore") },
        { href: "/new", label: t("newRecipe") },
        { href: "/login", label: t("login") },
      ];

  return (
    <header style={{ borderBottom: "1px solid var(--rule)", background: "var(--paper)" }} className="sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={12} />
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-[13px]" style={{ color: "var(--ink-2)" }}>
          <Link href="/explore" className="hover:opacity-80 transition" style={{ color: "inherit", textDecoration: "none" }}>
            {t("explore")}
          </Link>
          {user ? (
            <>
              <Link href="/library" className="hover:opacity-80 transition" style={{ color: "inherit", textDecoration: "none" }}>
                {t("library")}
              </Link>
              <Link href="/don-marco" className="hover:opacity-80 transition" style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                {t("donMarco")}
                <span className="tag tag-accent" style={{ fontSize: 8, padding: "1px 5px" }}>✦ IA</span>
              </Link>
            </>
          ) : (
            <Link href="/new" className="hover:opacity-80 transition" style={{ color: "inherit", textDecoration: "none" }}>
              {t("newRecipe")}
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <form action="/auth/logout" method="post" className="flex items-center gap-2">
                <span
                  className="hidden lg:inline mono"
                  style={{ fontSize: 10, color: "var(--ink-3)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={user.email ?? ""}
                >
                  {user.email}
                </span>
                <Link href="/settings" className="btn btn-sm btn-ghost">
                  {t("settings")}
                </Link>
                <button type="submit" className="btn btn-sm btn-ghost">
                  {tAuth("signOut")}
                </button>
              </form>
            ) : (
              <Link href="/login" className="btn btn-sm">
                {t("login")}
              </Link>
            )}
          </div>
          <MobileMenu items={mobileItems} signOutLabel={tAuth("signOut")} isLoggedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
