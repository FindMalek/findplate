import { EmailButton, EmailCard, EmailHeading, EmailText, ShadcnEmail } from "@opencoredev/email-sdk/react"

export function LinkTemplate({ title, intro, cta, url }: { title: string; intro: string; cta: string; url: string }) {
  return (
    <ShadcnEmail preview={intro}>
      <EmailCard>
        <EmailHeading>{title}</EmailHeading>
        <EmailText>{intro}</EmailText>
        <EmailButton href={url}>{cta}</EmailButton>
        <EmailText muted>If you didn't ask for this, you can ignore this email.</EmailText>
      </EmailCard>
    </ShadcnEmail>
  )
}
