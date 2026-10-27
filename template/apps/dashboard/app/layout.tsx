import "@acme/ui/globals.css"
import { QueryProvider } from "@acme/orpc/react"
import { Toaster } from "@acme/ui/components/sonner"
import { TooltipProvider } from "@acme/ui/components/tooltip"
import { cn } from "@acme/ui/lib/utils"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { fontVariables } from "./fonts"

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · acme" },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("antialiased", fontVariables, "font-sans")}>
      <body className="bg-background text-foreground">
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
