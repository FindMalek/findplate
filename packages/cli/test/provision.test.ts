import { expect, test } from "bun:test"
import { buildPlan } from "../src/commands/provision"
import { desiredRecords, missingRecords } from "../src/provision/dns"
import { desiredProjects, missingProjects } from "../src/provision/dokploy"
import { signV4 } from "../src/provision/s3"
import type { Ctx } from "../src/provision/task"

const ctx: Ctx = {
  config: {
    dokployUrl: "https://dokploy.example.com",
    dnsProvider: "cloudflare",
    s3Endpoint: "https://s3.example.com",
  },
  dir: ".",
  name: "demo",
  repo: "acme/demo",
  domain: "demo.dev",
  envs: ["production", "preview"],
}

test("signV4 signs the aws s3 get object example", () => {
  const headers = signV4({
    method: "GET",
    url: "https://examplebucket.s3.amazonaws.com/test.txt",
    region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEi/K7MDENG/bPxRfiCYEXAMPLEKEY",
    date: new Date("2013-05-24T00:00:00Z"),
    headers: { range: "bytes=0-9" },
  })
  expect(headers.authorization).toContain("Signature=ab91ab3a26583463d6155965959a85c470c32ede55120ac021d064fa51040ea6")
})

test("rerunning only plans what's missing", () => {
  const projects = desiredProjects(ctx)
  expect(missingProjects(projects, ["demo-production"]).map((project) => project.name)).toEqual(["demo-preview"])

  const records = desiredRecords("vercel", "1.2.3.4")
  const have = [{ name: "api", type: "A" as const, value: "1.2.3.4" }]
  expect(missingRecords(records, have).map((record) => record.name)).toEqual(["", "dashboard", "docs", "*.preview"])
})

test("the plan covers every target without touching the network", () => {
  const ids = buildPlan(["dokploy", "s3", "dns", "turbo", "backup"], ctx).map((task) => task.id)
  expect(ids).toEqual([
    "dokploy:project:demo-production",
    "dokploy:project:demo-preview",
    "s3:production",
    "s3:preview",
    "dns:@",
    "dns:dashboard",
    "dns:api",
    "dns:docs",
    "dns:*.preview",
    "turbo:cache",
    "backup:workflow",
  ])
})

test("planning fails early when the user config is missing", () => {
  expect(() => buildPlan(["dokploy"], { ...ctx, config: {} })).toThrow("dokployUrl")
})
