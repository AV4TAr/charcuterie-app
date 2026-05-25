import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/lib/i18n/config";
import { SiteNav } from "@/components/layout/site-nav";
import "../globals.css";

export const metadata: Metadata = {
  title: "Chorizo Lab",
  description: "Recetas de chorizo y embutidos con cálculos automáticos.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#131318",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const themeInitScript = `
(function(){try{var t=localStorage.getItem('cl-theme')||'dark';document.body.classList.add('theme-lab',t);}catch(e){document.body.classList.add('theme-lab','dark');}})();
`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className="theme-lab dark min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <NextIntlClientProvider>
          <SiteNav />
          <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
