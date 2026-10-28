import { describe, expect, test } from "bun:test"
import { renderToMarkdown } from "fumadocs-core/server"
import { Callout, Card, Cards, FileTree, Step, Steps, Tab, Tabs } from "../components/docs/markdown"

const render = async (node: React.ReactNode) => (await renderToMarkdown(node)).trim()

describe("mdx components as markdown", () => {
  test("Callout becomes a labelled blockquote", async () => {
    expect(
      await render(
        <Callout type="warn" title="Careful">
          Do not run this twice.
        </Callout>,
      ),
    ).toBe("> **Warning: Careful**\n>\n> Do not run this twice.")
  })

  test("Cards become a link list", async () => {
    const out = await render(
      <Cards>
        <Card title="Setup" href="/docs/setup">
          Install it.
        </Card>
        <Card title="Plain">No link.</Card>
        <Card title="Para" href="/docs/p">
          <p>Wrapped by mdx.</p>
        </Card>
      </Cards>,
    )
    expect(out).toBe("- [Setup](/docs/setup): Install it.\n- **Plain**: No link.\n- [Para](/docs/p): Wrapped by mdx.")
  })

  test("Steps keep their order as separate blocks", async () => {
    const out = await render(
      <Steps>
        <Step>first</Step>
        <Step>second</Step>
      </Steps>,
    )
    expect(out).toBe("first\n\nsecond")
  })

  test("Tabs label every tab", async () => {
    const out = await render(
      <Tabs>
        <Tab value="pnpm">pnpm add x</Tab>
        <Tab value="bun">bun add x</Tab>
      </Tabs>,
    )
    expect(out).toBe("**pnpm**\n\npnpm add x\n\n**bun**\n\nbun add x")
  })

  test("FileTree becomes a text tree with notes", async () => {
    const out = await render(
      <FileTree
        label="app/"
        items={[
          { name: "apps/", children: [{ name: "web/", note: "landing" }, { name: "api/" }] },
          { name: "turbo.json" },
        ]}
      />,
    )
    expect(out).toBe(
      ["**app/**", "", "```text", "├─ apps/", "│  ├─ web/  # landing", "│  └─ api/", "└─ turbo.json", "```"].join("\n"),
    )
  })
})
