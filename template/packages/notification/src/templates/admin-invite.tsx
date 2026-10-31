import { defineTemplate } from "./define"
import { Box, CtaButton, IGNORE_NOTE, Label, Layout, LinkFallback, Paragraph, Rows, Title } from "./primitives"

interface Data {
  inviter: string
  role: string
  url: string
}

export const adminInvite = defineTemplate<Data>({
  subject: ({ inviter }) => `${inviter} invited you`,
  summary: ({ inviter, role, url }) => ({
    title: "You're invited",
    lines: [`${inviter} invited you as ${role}.`],
    link: { label: "Accept invite", url },
  }),
  preview: { inviter: "Grace Hopper", role: "admin", url: "https://app.example.com/invite?token=a7b9" },
  Email: ({ inviter, role, url, appUrl }) => (
    <Layout preview={`${inviter} invited you to join.`} appUrl={appUrl}>
      <Box>
        <Label>Invitation</Label>
        <Title>You're invited</Title>
        <Paragraph>{inviter} invited you to join. Accept the invite to set up your account.</Paragraph>
        <Rows
          rows={[
            { label: "Invited by", value: inviter },
            { label: "Role", value: role },
          ]}
        />
        <CtaButton href={url}>Accept invite</CtaButton>
        <LinkFallback url={url} />
      </Box>
      <Paragraph muted>{IGNORE_NOTE}</Paragraph>
    </Layout>
  ),
})
