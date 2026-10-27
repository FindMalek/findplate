import { nextEnv } from "@acme/env/next"
import Script from "next/script"

export function Umami() {
  const { NEXT_PUBLIC_UMAMI_URL: url, NEXT_PUBLIC_UMAMI_WEBSITE_ID: websiteId } = nextEnv()
  if (!websiteId) return null
  return <Script src={`${url}/script.js`} data-website-id={websiteId} strategy="afterInteractive" />
}
