"use client"

import { FLAGS, type FlagName } from "@acme/flags"
import { useQuery } from "@tanstack/react-query"
import { orpc } from "./react"

/** For client components: the flag as it applies to the visitor. The code default shows until the answer arrives. */
export function useFlag(name: FlagName): boolean {
  const { data } = useQuery(orpc.flags.all.queryOptions())
  return data?.[name] ?? FLAGS[name].default
}
