import { expect, test } from "bun:test"
import { BRAND } from "./brand"
import { renderEmail } from "./render"
import { getTemplate, type TemplateName, templates } from "./templates"

test("every template renders html and text from its sample props in the brand colors", async () => {
  for (const name of Object.keys(templates) as TemplateName[]) {
    const { subject, html, text } = await renderEmail(name, getTemplate(name).preview as never, "https://app.test")
    const rendered = `${subject}\n${html}\n${text}`
    expect({ name, leaked: /undefined|\[object|\{\{|NaN/.test(rendered) }).toEqual({ name, leaked: false })
    expect(subject.length).toBeGreaterThan(0)
    expect(html).toContain(BRAND.light.background)
    expect(html).toContain(BRAND.light.primary)
    expect(html).toContain(BRAND.dark.background)
    expect(html).toContain("prefers-color-scheme: dark")
    expect(text).not.toContain("<")
    expect(text.toLowerCase()).toContain(BRAND.name.toLowerCase())
  }
})
