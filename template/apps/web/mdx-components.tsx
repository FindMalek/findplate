import type { MDXComponents } from "mdx/types"

/** How markdown renders in the blog and the changelog. Add your own components to this map. */
const components: MDXComponents = {
  h1: (props) => <h1 className="mt-8 font-heading font-semibold text-3xl tracking-tight" {...props} />,
  h2: (props) => <h2 className="mt-8 font-heading font-semibold text-xl tracking-tight" {...props} />,
  h3: (props) => <h3 className="mt-6 font-heading font-semibold text-lg" {...props} />,
  p: (props) => <p className="mt-4 text-muted-foreground leading-relaxed" {...props} />,
  ul: (props) => <ul className="mt-4 list-disc space-y-1 pl-6 text-muted-foreground" {...props} />,
  ol: (props) => <ol className="mt-4 list-decimal space-y-1 pl-6 text-muted-foreground" {...props} />,
  a: (props) => <a className="text-foreground underline underline-offset-4" {...props} />,
  code: (props) => <code className="bg-muted px-1 py-0.5 font-mono text-sm" {...props} />,
  pre: (props) => <pre className="mt-4 overflow-x-auto bg-muted p-4 font-mono text-sm" {...props} />,
}

export function useMDXComponents(): MDXComponents {
  return components
}
