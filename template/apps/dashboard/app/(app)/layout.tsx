import { SidebarInset, SidebarProvider } from "@acme/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { BetaBanner } from "@/components/beta-banner" // @findplate:flags
import { ImpersonationBanner } from "@/components/impersonation-banner" // @findplate:impersonation
import { call } from "@/lib/api"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await call((api) => api.me.get())
  return (
    <SidebarProvider>
      <AppSidebar me={me} />
      {/* @findplate:impersonation */}
      <ImpersonationBanner />
      {/* @end */}
      {/* @findplate:flags */}
      <BetaBanner />
      {/* @end */}
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  )
}
