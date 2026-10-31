import { adminClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/** The browser client with the organization plugin, for the team page. Same `/api/auth` proxy as `authClient`. */
export const orgClient = createAuthClient({ basePath: "/api/auth", plugins: [adminClient(), organizationClient()] })
