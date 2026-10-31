import type { Metadata } from "next"
import { PageHeader } from "@/components/page-header"
import { TeamBoard } from "@/components/team-board"

export const metadata: Metadata = { title: "Team" }

export default function TeamPage() {
  return (
    <>
      <PageHeader
        title="Team"
        description="Organizations, members and invites. Notes follow the active organization."
      />
      <div className="p-4 md:p-6">
        <TeamBoard />
      </div>
    </>
  )
}
