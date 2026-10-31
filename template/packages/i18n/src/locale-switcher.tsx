import { getLocale, getTranslations } from "next-intl/server"
import { LocaleSwitcherMenu } from "./locale-switcher-menu"

/** Server side so the client menu gets plain props and no provider is needed above it. */
export async function LocaleSwitcher({ mode }: { mode: "path" | "cookie" }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("language")])
  return <LocaleSwitcherMenu locale={locale} mode={mode} label={t("label")} />
}

/** The switcher as a settings row: a label, a hint and the menu. */
export async function LocaleSetting({ mode }: { mode: "path" | "cookie" }) {
  const t = await getTranslations("language")
  return (
    <div className="mt-6 flex items-center justify-between gap-4 border-t pt-6">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm">{t("label")}</span>
        <span className="text-muted-foreground text-sm">{t("description")}</span>
      </div>
      <LocaleSwitcher mode={mode} />
    </div>
  )
}
