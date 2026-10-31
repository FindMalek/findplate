import { CONSENT_COOKIE } from "@acme/compliance" // @findplate:compliance
import { nextEnv } from "@acme/env/next"
import { Databuddy } from "@databuddy/sdk/react"
import { cookies } from "next/headers" // @findplate:compliance

export async function Analytics() {
  const clientId = nextEnv().NEXT_PUBLIC_DATABUDDY_CLIENT_ID
  if (!clientId) return null
  if ((await cookies()).get(CONSENT_COOKIE)?.value !== "granted") return null // @findplate:compliance
  return <Databuddy clientId={clientId} trackWebVitals />
}
