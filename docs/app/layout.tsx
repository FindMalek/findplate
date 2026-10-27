import "./globals.css"
import { RootProvider } from "fumadocs-ui/provider/next"
import type { Metadata } from "next"
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google"
import type { ReactNode } from "react"
import { SITE } from "@/lib/site"

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.DOCS_URL ?? "http://localhost:3000"),
  title: { default: `${SITE.name}: ${SITE.pitch}`, template: `%s | ${SITE.name}` },
  description: SITE.pitch,
  twitter: { card: "summary_large_image" },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
