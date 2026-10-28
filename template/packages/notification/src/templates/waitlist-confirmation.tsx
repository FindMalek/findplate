import { defineTemplate } from "./define"
import { Box, Label, Layout, Paragraph, Rows, Title } from "./primitives"

interface Data {
  email: string
}

export const waitlistConfirmation = defineTemplate<Data>({
  subject: () => "You're on the list",
  summary: ({ email }) => ({ title: "You're on the list", lines: [`${email} joined the waitlist.`] }),
  preview: { email: "ada@example.com" },
  Email: ({ email, appUrl }) => (
    <Layout preview="You're on the waitlist. We'll write when there's a spot." appUrl={appUrl}>
      <Box>
        <Label>Waitlist</Label>
        <Title>You're on the list</Title>
        <Paragraph>Thanks for signing up. We'll write to this address as soon as there's a spot for you.</Paragraph>
        <Rows
          rows={[
            { label: "Email", value: email },
            { label: "Status", value: "Waiting" },
          ]}
        />
      </Box>
      <Paragraph muted>You'll only hear from us about access. Reply to this email if you want off the list.</Paragraph>
    </Layout>
  ),
})
