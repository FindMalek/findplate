import { SidebarInset, SidebarProvider } from "@acme/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { BetaBanner } from "@/components/beta-banner" // @findplate:flags
import { ImpersonationBanner } from "@/components/impersonation-banner" // @findplate:impersonation
import { InboxBell } from "@/components/inbox-bell" // @findplate:inbox
import { call } from "@/lib/api"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await call((api) => api.me.get())
  const { unread } = await call((api) => api.inbox.list()) // @findplate:inbox
  return (
    <SidebarProvider>
      <AppSidebar me={me} />
      {/* @findplate:impersonation */}
      <ImpersonationBanner />
      {/* @end */}
      {/* @findplate:inbox */}
      <InboxBell unread={unread} />
      {/* @end */}
      {/* @findplate:flags */}
      <BetaBanner />
      {/* @end */}
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  )
}
