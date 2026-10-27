export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init)
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${new URL(url).pathname} failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return (text ? JSON.parse(text) : {}) as T
}

export const json = (headers: Record<string, string>, body?: unknown): RequestInit => ({
  method: body === undefined ? "GET" : "POST",
  headers: { "content-type": "application/json", ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
})
