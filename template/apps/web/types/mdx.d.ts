declare module "*.mdx" {
  import type { MDXProps } from "mdx/types"

  export const meta: { title: string; description: string; date: string } | undefined
  export default function MDXContent(props: MDXProps): React.JSX.Element
}
