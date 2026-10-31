import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"
import { useState } from "react"
import { authClient } from "@/lib/auth"

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }))
  const { data: session, isPending } = authClient.useSession()
  if (isPending) return null
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="index" options={{ title: "Notes" }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  )
}
