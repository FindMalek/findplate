import { defineTemplate } from "./define"
import { Box, CtaButton, Label, Layout, Paragraph, Rows, Title } from "./primitives"

interface Data {
  name?: string
  url: string
}

export const welcome = defineTemplate<Data>({
  subject: () => "Welcome aboard",
  summary: ({ name, url }) => ({
    title: "Welcome aboard",
    lines: [name ? `${name}, your account is ready.` : "Your account is ready."],
    link: { label: "Open the app", url },
  }),
  preview: { name: "Ada", url: "https://app.example.com" },
  Email: ({ name, url, appUrl }) => (
    <Layout preview="Your account is ready." appUrl={appUrl}>
      <Box>
        <Label>Welcome</Label>
        <Title>{name ? `Welcome, ${name}` : "Welcome aboard"}</Title>
        <Paragraph>Your account is ready. Here is where to start.</Paragraph>
        <Rows
          rows={[
            { label: "Step 1", value: "Open the dashboard" },
            { label: "Step 2", value: "Create your first note" },
            { label: "Step 3", value: "Invite your team" },
          ]}
        />
        <CtaButton href={url}>Open the app</CtaButton>
      </Box>
    </Layout>
  ),
})
