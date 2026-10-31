import type { AppRouterClient } from "@acme/orpc/client"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins"
import { API_URL, authClient } from "./auth"

/** The same typed client the web apps use. Signed-in calls carry the session cookie the auth client stored. */
export const api = createORPCClient<AppRouterClient>(
  new RPCLink({
    url: `${API_URL}/rpc`,
    headers: async () => ({ cookie: await authClient.getCookie() }),
    plugins: [new SimpleCsrfProtectionLinkPlugin()],
  }),
)
