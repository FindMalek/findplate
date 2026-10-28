import type { Job } from "../define"
import { cleanupSessions } from "./cleanup-sessions"
import { echo } from "./echo"

/** Every job the worker runs. A new job is one file in this folder plus one line here. */
export const JOBS: readonly Job[] = [cleanupSessions, echo]
