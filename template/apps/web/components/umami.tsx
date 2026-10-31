import { CONSENT_COOKIE } from "@acme/compliance" // @findplate:compliance
import { nextEnv } from "@acme/env/next"
import { cookies } from "next/headers" // @findplate:compliance
import Script from "next/script"

export async function Umami() {
  const { NEXT_PUBLIC_UMAMI_URL: url, NEXT_PUBLIC_UMAMI_WEBSITE_ID: websiteId } = nextEnv()
  if (!websiteId) return null
  if ((await cookies()).get(CONSENT_COOKIE)?.value !== "granted") return null // @findplate:compliance
  return <Script src={`${url}/script.js`} data-website-id={websiteId} strategy="afterInteractive" />
}
