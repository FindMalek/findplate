import { json, request } from "./http"
import { secret } from "./secrets"
import type { Ctx, Task } from "./task"

export type RecordType = "A" | "CNAME" | "ALIAS"
export interface DnsRecord {
  name: string
  type: RecordType
  value: string
}

const VERCEL_TARGET = "cname.vercel-dns.com"
const isIp = (value: string) => /^\d+\.\d+\.\d+\.\d+$/.test(value)

/** web and dashboard live on Vercel, api, docs and previews on the Dokploy host. "" is the apex. */
export function desiredRecords(provider: string, host: string): DnsRecord[] {
  const server: Pick<DnsRecord, "type" | "value"> = isIp(host)
    ? { type: "A", value: host }
    : { type: "CNAME", value: host }
  return [
    { name: "", type: provider === "vercel" ? "ALIAS" : "CNAME", value: VERCEL_TARGET },
    { name: "dashboard", type: "CNAME", value: VERCEL_TARGET },
    { name: "api", ...server },
    { name: "docs", ...server },
    { name: "*.preview", ...server },
  ]
}

export const missingRecords = (desired: DnsRecord[], existing: DnsRecord[]) =>
  desired.filter((record) => !existing.some((have) => have.name === record.name && have.type === record.type))

interface Provider {
  list: () => Promise<DnsRecord[]>
  create: (record: DnsRecord) => Promise<void>
}

function vercelDns(domain: string, token: string): Provider {
  const auth = { authorization: `Bearer ${token}` }
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ""
  return {
    async list() {
      const res = await request<{ records: DnsRecord[] }>(
        `https://api.vercel.com/v4/domains/${domain}/records${team}`,
        json(auth),
      )
      return res.records
    },
    async create({ name, type, value }) {
      await request(`https://api.vercel.com/v2/domains/${domain}/records${team}`, json(auth, { name, type, value }))
    },
  }
}

async function cloudflareDns(domain: string, token: string): Promise<Provider> {
  const root = "https://api.cloudflare.com/client/v4"
  const auth = { authorization: `Bearer ${token}` }
  const zones = await request<{ result: { id: string }[] }>(`${root}/zones?name=${domain}`, json(auth))
  const zone = zones.result[0]?.id
  if (!zone) throw new Error(`Cloudflare has no zone for ${domain}`)
  return {
    async list() {
      const res = await request<{ result: { name: string; type: RecordType; content: string }[] }>(
        `${root}/zones/${zone}/dns_records?per_page=500`,
        json(auth),
      )
      return res.result.map((record) => ({
        name: record.name === domain ? "" : record.name.slice(0, -(domain.length + 1)),
        type: record.type,
        value: record.content,
      }))
    },
    async create({ name, type, value }) {
      const fqdn = name ? `${name}.${domain}` : domain
      await request(
        `${root}/zones/${zone}/dns_records`,
        json(auth, { type, name: fqdn, content: value, proxied: false, ttl: 1 }),
      )
    },
  }
}

export function planDns(ctx: Ctx): Task[] {
  const { dnsProvider, dokployUrl } = ctx.config
  if (dnsProvider !== "vercel" && dnsProvider !== "cloudflare") {
    throw new Error("Set your DNS provider first: findplate config set dnsProvider vercel|cloudflare")
  }
  if (!ctx.domain) throw new Error("Pass --domain example.com")
  const domain = ctx.domain
  const host = process.env.SERVER_HOST ?? (dokployUrl ? new URL(dokployUrl).hostname : "")
  if (!host) throw new Error("Set dokployUrl or SERVER_HOST so api, docs and previews know where to point")
  return desiredRecords(dnsProvider, host).map((record) => ({
    id: `dns:${record.name || "@"}`,
    title: `${dnsProvider} ${record.type} ${record.name || "@"}.${domain} -> ${record.value}`,
    async run() {
      const token =
        dnsProvider === "vercel"
          ? await secret("VERCEL_TOKEN", "Vercel token")
          : await secret("CLOUDFLARE_API_TOKEN", "Cloudflare API token")
      const dns = dnsProvider === "vercel" ? vercelDns(domain, token) : await cloudflareDns(domain, token)
      if (missingRecords([record], await dns.list()).length) await dns.create(record)
    },
  }))
}
