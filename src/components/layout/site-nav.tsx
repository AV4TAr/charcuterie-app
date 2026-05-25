import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteNav() {
  const t = await getTranslations("nav");
  const tAuth = await getTranslations("auth");
  const tApp = await getTranslations("app");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🌭</span>
          <span className="text-lg font-semibold text-zinc-100 group-hover:text-amber-300 transition">
            {tApp("name")}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-100 transition">
            {t("home")}
          </Link>
          <Link href="/explore" className="hover:text-zinc-100 transition">
            {t("explore")}
          </Link>
          <Link href="/new" className="hover:text-zinc-100 transition">
            {t("newRecipe")}
          </Link>
          {user && (
            <Link href="/favorites" className="hover:text-zinc-100 transition">
              {t("favorites")}
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          {user ? (
            <form action="/auth/logout" method="post" className="flex items-center gap-3">
              <span
                className="hidden sm:inline text-xs text-zinc-500 truncate max-w-[160px]"
                title={user.email ?? ""}
              >
                {user.email}
              </span>
              <button
                type="submit"
                className="text-sm text-zinc-400 hover:text-zinc-100 transition"
              >
                {tAuth("signOut")}
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
