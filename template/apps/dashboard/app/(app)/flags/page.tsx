import type { Metadata } from "next"
import { FlagsBoard } from "@/components/flags-board"
import { PageHeader } from "@/components/page-header"
import { call } from "@/lib/api"

export const metadata: Metadata = { title: "Flags" }

export default async function FlagsPage() {
  const flags = await call((api) => api.flags.list())
  return (
    <>
      <PageHeader title="Flags" description="Feature flags and their rollout. Admins only." />
      <div className="p-4 md:p-6">
        <FlagsBoard flags={flags} />
      </div>
    </>
  )
}
