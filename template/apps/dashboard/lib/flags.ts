import "server-only"
import { FLAGS, type FlagName } from "@acme/flags"
import { cache } from "react"
import { call } from "./api"

/** One api call per request, with the visitor's cookie so the answer is per user. */
const allFlags = cache(() => call((api) => api.flags.all()).catch(() => null))

/** For server components. Falls back to the default in code when the api is down. */
export async function getFlag(name: FlagName): Promise<boolean> {
  return (await allFlags())?.[name] ?? FLAGS[name].default
}
