import { Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text } from "@react-email/components"
import type { CSSProperties, ReactNode } from "react"
import { BRAND } from "../brand"

const { light, dark } = BRAND

/** Shared by every template; the notifier fills `appUrl` from the api's public app url. */
export interface BaseProps {
  appUrl?: string
}

const radius = `${BRAND.radius}px`

/** Dark mode swaps colors through classes, because inline styles can't answer `prefers-color-scheme`. */
const DARK_CSS = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
.e-bg { background-color: ${light.background}; }
@media (prefers-color-scheme: dark) {
  .e-bg { background-color: ${dark.background} !important; }
  .e-fg { color: ${dark.foreground} !important; }
  .e-mut { color: ${dark.muted} !important; }
  .e-bd { border-color: ${dark.border} !important; }
  .e-sf { background-color: ${dark.surface} !important; }
  .e-pr { background-color: ${dark.primary} !important; border-color: ${dark.primary} !important; color: ${dark.primaryForeground} !important; }
}
`

const base: CSSProperties = { margin: 0, fontFamily: BRAND.fontSans, color: light.foreground }

export function Layout({ preview, appUrl, children }: { preview: string; appUrl?: string; children: ReactNode }) {
  const host = appUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "")
  return (
    <Html lang="en" style={{ backgroundColor: light.background }} className="e-bg">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{DARK_CSS}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="e-bg" style={{ ...base }}>
        <Container
          className="e-bg"
          style={{
            maxWidth: 560,
            width: "100%",
            margin: "0 auto",
            padding: "40px 16px",
            backgroundColor: light.background,
          }}
        >
          <Text
            className="e-fg"
            style={{
              ...base,
              margin: "0 0 24px",
              fontSize: 22,
              lineHeight: "28px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            {BRAND.name}
            <span
              className="e-pr"
              style={{
                display: "inline-block",
                width: 8,
                height: 20,
                marginLeft: 4,
                verticalAlign: "-3px",
                backgroundColor: light.primary,
              }}
            >
              &nbsp;
            </span>
          </Text>
          {children}
          <Section style={{ padding: "24px 0 0" }}>
            <Label>
              Sent by {BRAND.name}
              {host ? ` · ${host}` : ""}
            </Label>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/** One bordered panel; `surface` tints it for secondary content. */
export function Box({ children, surface = false }: { children: ReactNode; surface?: boolean }) {
  return (
    <Section
      className={surface ? "e-bd e-sf" : "e-bd"}
      style={{
        border: `1px solid ${light.border}`,
        borderRadius: radius,
        backgroundColor: surface ? light.surface : "transparent",
        padding: 28,
        marginBottom: 12,
      }}
    >
      {children}
    </Section>
  )
}

/** Small mono uppercase caption. */
export function Label({ children }: { children: ReactNode }) {
  return (
    <Text
      className="e-mut"
      style={{
        ...base,
        margin: 0,
        color: light.muted,
        fontFamily: BRAND.fontMono,
        fontSize: 11,
        lineHeight: "16px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  )
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text
      className="e-fg"
      style={{
        ...base,
        margin: "12px 0 0",
        fontSize: 30,
        lineHeight: "36px",
        fontWeight: 700,
        letterSpacing: "-0.03em",
      }}
    >
      {children}
    </Text>
  )
}

export function Paragraph({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <Text
      className={muted ? "e-mut" : "e-fg"}
      style={{
        ...base,
        margin: "16px 0 0",
        color: muted ? light.muted : light.foreground,
        fontSize: muted ? 13 : 16,
        lineHeight: muted ? "20px" : "26px",
      }}
    >
      {children}
    </Text>
  )
}

export function CtaButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "28px 0 0" }}>
      <Button
        href={href}
        className="e-pr"
        style={{
          display: "inline-block",
          boxSizing: "border-box",
          backgroundColor: light.primary,
          border: `1px solid ${light.primary}`,
          borderRadius: radius,
          color: light.primaryForeground,
          fontFamily: BRAND.fontMono,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.1em",
          lineHeight: "16px",
          padding: "14px 24px",
          textDecoration: "none",
          textTransform: "uppercase",
        }}
      >
        {children}
      </Button>
    </Section>
  )
}

/** A mono, wrapped block for links, codes and other copyable values. */
export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <Section
      className="e-bd e-sf"
      style={{
        border: `1px solid ${light.border}`,
        borderRadius: radius,
        backgroundColor: light.surface,
        padding: "12px 14px",
        margin: "8px 0 0",
      }}
    >
      <Text
        className="e-fg"
        style={{
          ...base,
          fontFamily: BRAND.fontMono,
          fontSize: 12,
          lineHeight: "18px",
          wordBreak: "break-all",
        }}
      >
        {children}
      </Text>
    </Section>
  )
}

/** The link again as text, for clients that strip buttons. */
export function LinkFallback({ url }: { url: string }) {
  return (
    <Section style={{ margin: "28px 0 0" }}>
      <Label>Or paste this link</Label>
      <CodeBlock>
        <Link href={url} className="e-fg" style={{ color: light.foreground, textDecoration: "none" }}>
          {url}
        </Link>
      </CodeBlock>
    </Section>
  )
}

export function Divider() {
  return <Hr className="e-bd" style={{ border: 0, borderTop: `1px solid ${light.border}`, margin: "28px 0 20px" }} />
}

/** Key and value pairs in rows with 1px rules between them. */
export function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <Section style={{ margin: "20px 0 0" }}>
      {rows.map((row) => (
        <Section key={row.label} className="e-bd" style={{ borderTop: `1px solid ${light.border}`, padding: "10px 0" }}>
          <Label>{row.label}</Label>
          <Text className="e-fg" style={{ ...base, margin: "2px 0 0", fontSize: 15, lineHeight: "22px" }}>
            {row.value}
          </Text>
        </Section>
      ))}
    </Section>
  )
}

export const IGNORE_NOTE = "If you didn't ask for this, you can ignore this email."
