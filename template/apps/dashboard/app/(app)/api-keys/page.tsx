import type { Metadata } from "next"
import { ApiKeysBoard } from "@/components/api-keys-board"
import { PageHeader } from "@/components/page-header"
import { call } from "@/lib/api"

export const metadata: Metadata = { title: "API keys" }

export default async function ApiKeysPage() {
  const keys = await call((api) => api.apiKeys.list())
  return (
    <>
      <PageHeader title="API keys" description="Bearer keys for the REST api: Authorization: Bearer <key>." />
      <div className="p-4 md:p-6">
        <ApiKeysBoard keys={keys} />
      </div>
    </>
  )
}
