"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/lib/i18n/routing";
import { locales } from "@/lib/i18n/config";
import { Select } from "@/components/ui/select";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  return (
    <Select
      value={locale}
      onChange={(e) => {
        const next = e.target.value as (typeof locales)[number];
        startTransition(() => {
          router.replace(pathname, { locale: next });
        });
      }}
      className="h-8 text-xs w-20"
      aria-label="Language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {l.toUpperCase()}
        </option>
      ))}
    </Select>
  );
}
