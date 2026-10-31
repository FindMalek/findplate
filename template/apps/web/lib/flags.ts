import "server-only"
import { FLAGS, type FlagName } from "@acme/flags"
import { cache } from "react"
import { getFlags } from "./api"

const allFlags = cache(getFlags)

/** For server components. The landing page has no session, so a partial rollout counts as off. */
export async function getFlag(name: FlagName): Promise<boolean> {
  return (await allFlags())?.[name] ?? FLAGS[name].default
}
