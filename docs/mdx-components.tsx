import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import defaultMdxComponents from "fumadocs-ui/mdx"
import type { MDXComponents } from "mdx/types"
import { Callout, Card, Cards, FileTree, Step, Steps, Table } from "@/components/docs/mdx"

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    pre: (props) => (
      <CodeBlock {...props} className="docs-code my-6">
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    Tab,
    Tabs,
    Callout,
    Card,
    Cards,
    FileTree,
    Step,
    Steps,
    table: Table,
    ...components,
  }
}
