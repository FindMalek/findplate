import { z } from "zod"
import { NOTE_BODY_MAX, NOTE_TITLE_MAX } from "../constants"

export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

const title = z.string().trim().min(1).max(NOTE_TITLE_MAX)
const body = z.string().max(NOTE_BODY_MAX)

export const noteInputSchema = z.object({ title, body: body.default(""), pinned: z.boolean().default(false) })

/** No defaults here: a patch only touches the fields it carries (a default would reset the rest). */
export const noteUpdateSchema = z.object({
  id: z.uuid(),
  title: title.optional(),
  body: body.optional(),
  pinned: z.boolean().optional(),
})

export const noteStatsSchema = z.object({ total: z.number(), pinned: z.number() })

export type Note = z.infer<typeof noteSchema>
