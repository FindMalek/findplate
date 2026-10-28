import { addDomain, verifyDomain } from "./resend-domain"

const [domain, flag] = process.argv.slice(2)
const apiKey = process.env.RESEND_API_KEY
if (!domain || !apiKey) {
  console.error("usage: RESEND_API_KEY=... pnpm --filter @acme/notification domain <example.com> [--verify]")
  process.exit(1)
}

const added = await addDomain(apiKey, domain)
const current = flag === "--verify" ? await verifyDomain(apiKey, added.id) : added
console.info(`${current.name} is ${current.status}. Create these dns records:\n`)
for (const record of current.records) {
  const priority = record.priority === undefined ? "" : ` (priority ${record.priority})`
  console.info(`${record.type.padEnd(6)} ${record.name.padEnd(22)} ${record.value}${priority}  [${record.status}]`)
}
if (current.status !== "verified") console.info("\nOnce they propagate, run again with --verify.")
