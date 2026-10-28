import type { ReactElement } from "react"
import type { BaseProps } from "./primitives"

/** What a template says outside email: a title, a few lines and an optional link. */
export interface Summary {
  title: string
  lines: string[]
  link?: { label: string; url: string }
}

export interface Template<Data extends object> {
  subject: (data: Data) => string
  Email: (props: Data & BaseProps) => ReactElement
  summary: (data: Data) => Summary
  /** Sample props for the preview app and tests. */
  preview: Data
}

export const defineTemplate = <Data extends object>(template: Template<Data>) => template

export const greeting = (name?: string) => (name ? `Hi ${name},` : "Hi,")
