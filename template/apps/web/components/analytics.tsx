import { nextEnv } from "@acme/env/next"
import { Databuddy } from "@databuddy/sdk/react"

export function Analytics() {
  const clientId = nextEnv().NEXT_PUBLIC_DATABUDDY_CLIENT_ID
  if (!clientId) return null
  return <Databuddy clientId={clientId} trackWebVitals />
}
