export const CONSENT_COOKIE = "consent"
export type Consent = "granted" | "denied"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export const parseConsent = (value: string | undefined | null): Consent | null =>
  value === "granted" || value === "denied" ? value : null

/** The `Set-Cookie`-style string the banner writes to `document.cookie`. */
export const consentCookie = (value: Consent) =>
  `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`
