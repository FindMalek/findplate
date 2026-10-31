import { BellIcon } from "lucide-react"
import Link from "next/link"

/** Floats top right on every app page, with the unread count. */
export function InboxBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/inbox"
      aria-label={unread ? `${unread} unread notifications` : "Notifications"}
      className="fixed top-3 right-4 z-40 inline-flex size-9 items-center justify-center border bg-card text-muted-foreground hover:text-foreground"
    >
      <BellIcon className="size-4" />
      {unread > 0 && (
        <span className="-top-1.5 -right-1.5 absolute grid min-w-4 place-items-center bg-primary px-1 text-[10px] text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  )
}
