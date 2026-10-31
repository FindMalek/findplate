import { defineTemplate, greeting } from "./define"
import { Box, CtaButton, IGNORE_NOTE, Label, Layout, LinkFallback, Paragraph, Title } from "./primitives"

interface Data {
  name?: string
  url: string
}

export const verifyEmail = defineTemplate<Data>({
  subject: () => "Verify your email",
  summary: ({ url }) => ({
    title: "Verify your email",
    lines: ["Confirm this address to finish setting up your account."],
    link: { label: "Verify email", url },
  }),
  preview: { name: "Ada", url: "https://app.example.com/verify?token=3f9a1c" },
  Email: ({ name, url, appUrl }) => (
    <Layout preview="Confirm this address to finish setting up your account." appUrl={appUrl}>
      <Box>
        <Label>Verify email</Label>
        <Title>Confirm your email address</Title>
        <Paragraph>{greeting(name)} confirm this address to finish setting up your account.</Paragraph>
        <CtaButton href={url}>Verify email</CtaButton>
        <LinkFallback url={url} />
      </Box>
      <Paragraph muted>{IGNORE_NOTE}</Paragraph>
    </Layout>
  ),
})
