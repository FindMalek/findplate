import { getTemplate, type TemplateName } from "@acme/notification/templates"
import { createElement } from "react"

const APP_URL = "https://app.example.com"

/** The preview page for a template: the package's own component with its sample props. */
export function preview(name: TemplateName) {
  const { Email, preview: props } = getTemplate(name)
  const Preview = () => createElement(Email, { ...props, appUrl: APP_URL })
  Preview.displayName = name
  return Preview
}
