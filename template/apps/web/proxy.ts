import { localeProxy } from "@acme/i18n/proxy"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  return localeProxy(request)
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] }
