export interface DnsRecord {
  record: string
  type: string
  name: string
  value: string
  priority?: number
  status: string
}

export interface ResendDomain {
  id: string
  name: string
  status: string
  records: DnsRecord[]
}

const API = "https://api.resend.com"

async function call<T>(apiKey: string, path: string, method: string, body?: unknown, doFetch = fetch): Promise<T> {
  const response = await doFetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await response.json()) as T & { message?: string }
  if (!response.ok) throw new Error(`Resend ${path}: ${json.message ?? response.status}`)
  return json
}

/** Adds the sending domain to Resend, or returns the existing one, with the dns records to create. */
export async function addDomain(apiKey: string, name: string, doFetch = fetch): Promise<ResendDomain> {
  const list = await call<{ data: { id: string; name: string }[] }>(apiKey, "/domains", "GET", undefined, doFetch)
  const found = list.data.find((domain) => domain.name === name)
  if (found) return call<ResendDomain>(apiKey, `/domains/${found.id}`, "GET", undefined, doFetch)
  return call<ResendDomain>(apiKey, "/domains", "POST", { name }, doFetch)
}

/** Asks Resend to check the dns records; the domain turns `verified` once they propagate. */
export async function verifyDomain(apiKey: string, id: string, doFetch = fetch): Promise<ResendDomain> {
  await call(apiKey, `/domains/${id}/verify`, "POST", undefined, doFetch)
  return call<ResendDomain>(apiKey, `/domains/${id}`, "GET", undefined, doFetch)
}
