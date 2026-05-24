import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/routing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("auth");

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t("signIn")}</CardTitle>
          <CardDescription>{t("magicLinkSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "callback" && (
            <p className="text-sm text-red-400">{t("callbackError")}</p>
          )}
          <LoginForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
