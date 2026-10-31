import { type Db, inboxItem } from "@acme/db"

export interface InboxMessage {
  title: string
  body?: string
  /** A dashboard path to open on click, e.g. `/billing`. */
  href?: string
}

/** Puts a message in a user's inbox. Call it from any procedure or job: `await notifyInbox(db, userId, { title })`. */
export async function notifyInbox(db: Db, userId: string, message: InboxMessage): Promise<void> {
  await db.insert(inboxItem).values({ userId, ...message })
}
