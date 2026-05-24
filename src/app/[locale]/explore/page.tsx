import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const tErr = await getTranslations("errors");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("explore")}</CardTitle>
        <CardDescription>{tErr("comingSoon")}</CardDescription>
      </CardHeader>
    </Card>
  );
}
