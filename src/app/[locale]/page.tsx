import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Calculator, GitFork, History, Sparkles } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightCalculator } from "@/components/recipe/weight-calculator";
import { demoRecipe } from "@/lib/recipes/demo-recipe";
import type { Locale } from "@/lib/i18n/config";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <div className="flex flex-col gap-16">
      <section className="text-center max-w-3xl mx-auto pt-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-50">
          {t("heroTitle")}
        </h1>
        <p className="mt-6 text-lg text-zinc-400">{t("heroSubtitle")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="#calculator">
            <Button size="lg">{t("ctaTry")}</Button>
          </Link>
          <Link href="/new">
            <Button size="lg" variant="outline">
              {t("ctaNew")}
            </Button>
          </Link>
        </div>
      </section>

      <section id="calculator" className="scroll-mt-24">
        <h2 className="mb-6 text-2xl font-semibold text-zinc-100">
          {demoRecipe.title}
          <span className="ml-2 text-sm font-normal text-zinc-500">
            v{demoRecipe.versionNumber} · {locale === "es" ? "demo" : "demo"}
          </span>
        </h2>
        <WeightCalculator
          ingredients={demoRecipe.ingredients}
          initialMeatAmount={1}
          initialMeatUnit="kg"
          locale={locale}
        />
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold text-zinc-100">
          {t("featuresTitle")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<Calculator className="size-5 text-amber-400" />}
            title={t("features.calculate")}
            description={t("features.calculateDesc")}
          />
          <FeatureCard
            icon={<History className="size-5 text-amber-400" />}
            title={t("features.version")}
            description={t("features.versionDesc")}
          />
          <FeatureCard
            icon={<GitFork className="size-5 text-amber-400" />}
            title={t("features.share")}
            description={t("features.shareDesc")}
          />
          <FeatureCard
            icon={<Sparkles className="size-5 text-amber-400" />}
            title={t("features.social")}
            description={t("features.socialDesc")}
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
