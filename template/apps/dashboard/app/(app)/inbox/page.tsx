import type { Metadata } from "next"
import { InboxList } from "@/components/inbox-list"
import { PageHeader } from "@/components/page-header"
import { call } from "@/lib/api"

export const metadata: Metadata = { title: "Inbox" }

export default async function InboxPage() {
  const { items, unread } = await call((api) => api.inbox.list())
  return (
    <>
      <PageHeader title="Inbox" description={unread ? `${unread} unread` : "All caught up."} />
      <div className="p-4 md:p-6">
        <InboxList items={items} unread={unread} />
      </div>
    </>
  )
}
