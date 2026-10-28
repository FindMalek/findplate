import "server-only"
import { createServerClient } from "@acme/orpc/server"

/** The api does the work; the web app only renders. Calls fail soft so a down api never blanks the page. */
const api = createServerClient()

export const getRepo = () => api.public.repo().catch(() => null)
export const getRoadmap = () => api.roadmap.list().catch(() => []) // @findplate:roadmap
export const getServices = () => api.status.services().catch(() => null) // @findplate:status
export const getFlags = () => api.flags.all().catch(() => null) // @findplate:flags
