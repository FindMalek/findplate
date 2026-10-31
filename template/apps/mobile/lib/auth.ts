import { expoClient } from "@better-auth/expo/client"
import { createAuthClient } from "better-auth/react"
import * as SecureStore from "expo-secure-store"

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "")

/** Talks to the api's `/auth` routes directly. The session cookie is kept in the device's secure storage. */
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: "/auth",
  plugins: [expoClient({ scheme: "acme", storagePrefix: "acme", storage: SecureStore })],
})
