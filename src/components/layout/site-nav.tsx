import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteNav() {
  const t = useTranslations("nav");
  const tApp = useTranslations("app");

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🌶️</span>
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
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/login"
            className="text-sm text-zinc-400 hover:text-zinc-100 transition"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </header>
  );
}
