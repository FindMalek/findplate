import type { Metadata } from "next"
import { SITE } from "@/lib/site"

export const metadata: Metadata = { title: "Terms of service" }

/** A starting point, not legal advice: replace the text with your own before you launch. */
export default function Page() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="font-heading font-semibold text-3xl">Terms of service</h1>
      <p className="mt-4 text-muted-foreground">
        This is a placeholder for the Terms of service of {SITE.name}. Replace it with the real text, written for your
        product, your data and your country.
      </p>
    </main>
  )
}
