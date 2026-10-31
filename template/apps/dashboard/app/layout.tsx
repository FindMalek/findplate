import "@acme/ui/globals.css"
import { QueryProvider } from "@acme/orpc/react"
import { Toaster } from "@acme/ui/components/sonner"
import { TooltipProvider } from "@acme/ui/components/tooltip"
import { cn } from "@acme/ui/lib/utils"
import type { Metadata } from "next"
import { getLocale } from "next-intl/server" // @findplate:i18n
import { Analytics } from "@/components/analytics" // @findplate:databuddy
import { ThemeProvider } from "@/components/theme-provider"
import { Umami } from "@/components/umami" // @findplate:umami
import { dashboardUrl, SITE } from "@/lib/site"
import { fontVariables } from "./fonts"

// Prerendered pages would bake the build-time DASHBOARD_URL into `metadataBase`.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(dashboardUrl()),
  title: { default: "Dashboard", template: "%s · acme" },
  description: SITE.tagline,
  openGraph: { title: `${SITE.name} dashboard`, description: SITE.tagline, siteName: SITE.name },
  twitter: { card: "summary_large_image" },
  robots: { index: false, follow: false },
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const page = { lang: "en" }
  page.lang = await getLocale() // @findplate:i18n
  return (
    <html lang={page.lang} suppressHydrationWarning className={cn("antialiased", fontVariables, "font-sans")}>
      <body className="bg-background text-foreground">
        <ThemeProvider>
          {/* @findplate:umami */}
          <Umami />
          {/* @end */}
          {/* @findplate:databuddy */}
          <Analytics />
          {/* @end */}
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
