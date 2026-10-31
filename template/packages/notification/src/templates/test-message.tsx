import { defineTemplate } from "./define"
import { Box, CodeBlock, CtaButton, Label, Layout, Paragraph, Title } from "./primitives"

interface Data {
  url: string
}

export const test = defineTemplate<Data>({
  subject: () => "Test message",
  summary: ({ url }) => ({
    title: "Test message",
    lines: ["Notifications are set up and sending from your api."],
    link: { label: "Open app", url },
  }),
  preview: { url: "https://app.example.com" },
  Email: ({ url, appUrl }) => (
    <Layout preview="Notifications are set up and sending from your api." appUrl={appUrl}>
      <Box>
        <Label>Test</Label>
        <Title>It works</Title>
        <Paragraph>Notifications are set up and sending from your api.</Paragraph>
        <CodeBlock>{url}</CodeBlock>
        <CtaButton href={url}>Open app</CtaButton>
      </Box>
    </Layout>
  ),
})
