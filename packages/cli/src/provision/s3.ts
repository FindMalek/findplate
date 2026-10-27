import { createHash, createHmac } from "node:crypto"
import { json, request } from "./http"
import { ghSet, secret } from "./secrets"
import type { Ctx, Task } from "./task"

const sha256 = (data: string) => createHash("sha256").update(data).digest("hex")
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest()

export interface SignInput {
  method: string
  url: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  date: Date
  headers?: Record<string, string>
  body?: string
}

/** AWS signature v4 for s3, returns the headers to send. */
export function signV4(input: SignInput): Record<string, string> {
  const url = new URL(input.url)
  const amzDate = input.date.toISOString().replace(/[-:]|\.\d{3}/g, "")
  const day = amzDate.slice(0, 8)
  const payloadHash = sha256(input.body ?? "")
  const headers: Record<string, string> = {
    ...input.headers,
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  }
  const names = Object.keys(headers).sort()
  const canonical = [
    input.method,
    url.pathname,
    url.searchParams.toString(),
    ...names.map((name) => `${name}:${headers[name]?.trim()}`),
    "",
    names.join(";"),
    payloadHash,
  ].join("\n")
  const scope = `${day}/${input.region}/s3/aws4_request`
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n")
  const key = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, day), input.region), "s3"), "aws4_request")
  const signature = createHmac("sha256", key).update(toSign).digest("hex")
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
  }
}

export const bucketName = (name: string, env: string) => `${name}-${env}`
export const envSuffix = (env: string) => env.toUpperCase().replace(/[^A-Z0-9]/g, "_")

interface Credentials {
  accessKeyId: string
  secretAccessKey: string
}

/** Any s3 api: create the bucket with an existing key, 409 means it's already ours. */
async function ensureBucketS3(endpoint: string, bucket: string, region: string, creds: Credentials) {
  const url = `${endpoint.replace(/\/$/, "")}/${bucket}`
  const res = await fetch(url, {
    method: "PUT",
    headers: signV4({ method: "PUT", url, region, ...creds, date: new Date() }),
  })
  if (!res.ok && res.status !== 409) throw new Error(`creating bucket ${bucket} failed (${res.status})`)
}

/** Garage admin api v2: paths and request bodies are from its openapi, `showSecretKey` on GetKeyInfo is assumed. */
function garageAdmin(adminUrl: string, token: string) {
  const root = `${adminUrl.replace(/\/$/, "")}/v2`
  const auth = { authorization: `Bearer ${token}` }
  return {
    async ensure(bucket: string): Promise<Credentials> {
      const buckets = await request<{ id: string; globalAliases: string[] }[]>(`${root}/ListBuckets`, json(auth))
      const bucketId =
        buckets.find((b) => b.globalAliases.includes(bucket))?.id ??
        (await request<{ id: string }>(`${root}/CreateBucket`, json(auth, { globalAlias: bucket }))).id
      const keys = await request<{ id: string; name: string }[]>(`${root}/ListKeys`, json(auth))
      const keyId = keys.find((k) => k.name === bucket)?.id
      const key = await request<{ accessKeyId: string; secretAccessKey: string }>(
        keyId ? `${root}/GetKeyInfo?id=${keyId}&showSecretKey=true` : `${root}/CreateKey`,
        json(auth, keyId ? undefined : { name: bucket }),
      )
      await request(
        `${root}/AllowBucketKey`,
        json(auth, {
          bucketId,
          accessKeyId: key.accessKeyId,
          permissions: { owner: true, read: true, write: true },
        }),
      )
      return key
    },
  }
}

export function planS3(ctx: Ctx): Task[] {
  const endpoint = ctx.config.s3Endpoint
  if (!endpoint) throw new Error("Set your S3 endpoint first: findplate config set s3Endpoint https://s3.example.com")
  const garage = Boolean(process.env.GARAGE_ADMIN_URL)
  return ctx.envs.map((env) => {
    const bucket = bucketName(ctx.name, env)
    const suffix = envSuffix(env)
    return {
      id: `s3:${env}`,
      title: `${garage ? "Garage" : "S3"} bucket ${bucket}${garage ? " + access key" : ""}, saved as GitHub ${ctx.repo} secrets S3_*_${suffix}`,
      async run() {
        const region = process.env.S3_REGION ?? (garage ? "garage" : "us-east-1")
        const creds: Credentials = garage
          ? await garageAdmin(
              process.env.GARAGE_ADMIN_URL as string,
              await secret("GARAGE_ADMIN_TOKEN", "Garage admin token"),
            ).ensure(bucket)
          : {
              accessKeyId: await secret("S3_ACCESS_KEY_ID", "S3 access key id"),
              secretAccessKey: await secret("S3_SECRET_ACCESS_KEY", "S3 secret access key"),
            }
        if (!garage) await ensureBucketS3(endpoint, bucket, region, creds)
        ghSet("variable", ctx.repo, "S3_ENDPOINT", endpoint)
        ghSet("variable", ctx.repo, "S3_REGION", region)
        ghSet("variable", ctx.repo, `S3_BUCKET_${suffix}`, bucket)
        ghSet("secret", ctx.repo, `S3_ACCESS_KEY_ID_${suffix}`, creds.accessKeyId)
        ghSet("secret", ctx.repo, `S3_SECRET_ACCESS_KEY_${suffix}`, creds.secretAccessKey)
      },
    }
  })
}
