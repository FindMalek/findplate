import { defineTemplate, greeting } from "./define"
import { Box, CtaButton, IGNORE_NOTE, Label, Layout, LinkFallback, Paragraph, Title } from "./primitives"

interface Data {
  name?: string
  url: string
}

export const resetPassword = defineTemplate<Data>({
  subject: () => "Reset your password",
  summary: ({ url }) => ({
    title: "Reset your password",
    lines: ["Use the link to choose a new password."],
    link: { label: "Reset password", url },
  }),
  preview: { name: "Ada", url: "https://app.example.com/reset-password?token=8d21be" },
  Email: ({ name, url, appUrl }) => (
    <Layout preview="Choose a new password for your account." appUrl={appUrl}>
      <Box>
        <Label>Password reset</Label>
        <Title>Choose a new password</Title>
        <Paragraph>{greeting(name)} use the button below to choose a new password.</Paragraph>
        <CtaButton href={url}>Reset password</CtaButton>
        <LinkFallback url={url} />
      </Box>
      <Paragraph muted>{IGNORE_NOTE} Your password stays the same until you pick a new one.</Paragraph>
    </Layout>
  ),
})
