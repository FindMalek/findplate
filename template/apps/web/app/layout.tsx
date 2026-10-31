import "@acme/ui/globals.css"
import { ConsentBanner } from "@acme/compliance/banner" // @findplate:compliance
import { QueryProvider } from "@acme/orpc/react"
import { cn } from "@acme/ui/lib/utils"
import type { Metadata } from "next"
import { getLocale } from "next-intl/server" // @findplate:i18n
import { Analytics } from "@/components/analytics" // @findplate:databuddy
import { ThemeProvider } from "@/components/theme-provider"
import { Umami } from "@/components/umami" // @findplate:umami
import { siteUrl } from "@/lib/seo"
import { SITE } from "@/lib/site"
import { fontVariables } from "./fonts"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
  alternates: { canonical: "./" },
  openGraph: { title: SITE.name, description: SITE.tagline, type: "website", siteName: SITE.name, url: "./" },
  twitter: { card: "summary_large_image" },
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const page = { lang: "en" }
  page.lang = await getLocale() // @findplate:i18n
  return (
    <html lang={page.lang} suppressHydrationWarning className={cn("h-full antialiased", fontVariables, "font-sans")}>
      <body className="relative flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          {/* @findplate:umami */}
          <Umami />
          {/* @end */}
          {/* @findplate:databuddy */}
          <Analytics />
          {/* @end */}
          <QueryProvider>
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
              <div className="absolute inset-x-0 top-0 h-128 bg-glow" />
              <div className="absolute inset-0 bg-dots" />
            </div>
            {children}
          </QueryProvider>
          {/* @findplate:compliance */}
          <ConsentBanner />
          {/* @end */}
        </ThemeProvider>
      </body>
    </html>
  )
}
