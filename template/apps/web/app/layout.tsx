import "@acme/ui/globals.css"
import { QueryProvider } from "@acme/orpc/react"
import { cn } from "@acme/ui/lib/utils"
import type { Metadata } from "next"
import { Analytics } from "@/components/analytics" // @findplate:databuddy
import { ThemeProvider } from "@/components/theme-provider"
import { SITE } from "@/lib/site"
import { fontVariables } from "./fonts"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.WEB_URL ?? "http://localhost:3000"),
  title: SITE.name,
  description: SITE.tagline,
  openGraph: { title: SITE.name, description: SITE.tagline, type: "website" },
  twitter: { card: "summary_large_image" },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("h-full antialiased", fontVariables, "font-sans")}>
      <body className="relative flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  )
}
