import { defineTemplate } from "./define"
import { Box, CtaButton, IGNORE_NOTE, Label, Layout, LinkFallback, Paragraph, Title } from "./primitives"

interface Data {
  url: string
}

export const magicLink = defineTemplate<Data>({
  subject: () => "Your sign-in link",
  summary: ({ url }) => ({
    title: "Your sign-in link",
    lines: ["The link works once."],
    link: { label: "Sign in", url },
  }),
  preview: { url: "https://app.example.com/magic-link?token=c0ffee" },
  Email: ({ url, appUrl }) => (
    <Layout preview="Use this link to sign in. It works once." appUrl={appUrl}>
      <Box>
        <Label>Sign in</Label>
        <Title>Your sign-in link</Title>
        <Paragraph>Use the button below to sign in. The link works once.</Paragraph>
        <CtaButton href={url}>Sign in</CtaButton>
        <LinkFallback url={url} />
      </Box>
      <Paragraph muted>{IGNORE_NOTE}</Paragraph>
    </Layout>
  ),
})
