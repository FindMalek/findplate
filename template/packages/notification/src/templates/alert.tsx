import { defineTemplate } from "./define"
import { Box, CtaButton, Label, Layout, Paragraph, Rows, Title } from "./primitives"

interface Data {
  title: string
  intro?: string
  items: { label: string; value: string }[]
  url?: string
}

export const alert = defineTemplate<Data>({
  subject: ({ title }) => title,
  summary: ({ title, intro, items, url }) => ({
    title,
    lines: [...(intro ? [intro] : []), ...items.map((item) => `${item.label}: ${item.value}`)],
    link: url ? { label: "Open", url } : undefined,
  }),
  preview: {
    title: "Daily digest",
    intro: "Here is what happened in the last 24 hours.",
    items: [
      { label: "New signups", value: "12" },
      { label: "Failed payments", value: "1" },
      { label: "Open issues", value: "4" },
    ],
    url: "https://app.example.com/admin",
  },
  Email: ({ title, intro, items, url, appUrl }) => (
    <Layout preview={intro ?? title} appUrl={appUrl}>
      <Box>
        <Label>Notification</Label>
        <Title>{title}</Title>
        {intro ? <Paragraph>{intro}</Paragraph> : null}
        <Rows rows={items} />
        {url ? <CtaButton href={url}>Open</CtaButton> : null}
      </Box>
    </Layout>
  ),
})
