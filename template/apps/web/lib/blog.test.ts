import { expect, test } from "bun:test"
import { type PostMeta, rssFeed } from "./blog"

const post = (slug: string, date: string, title = slug): PostMeta => ({ slug, title, description: "d", date })

test("the feed lists newest first and escapes titles", () => {
  const xml = rssFeed([post("old", "2025-01-01"), post("new", "2026-01-01", "Fish & <chips>")], "https://acme.com")
  expect(xml.indexOf("/blog/new")).toBeLessThan(xml.indexOf("/blog/old"))
  expect(xml).toContain("<title>Fish &amp; &lt;chips&gt;</title>")
  expect(xml).toContain("<link>https://acme.com/blog/new</link>")
})
