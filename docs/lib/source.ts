import { loader } from "fumadocs-core/source"
import { applyMdxPreset } from "fumadocs-mdx/config"
import { defineDocs } from "fumadocs-mdx/macro"
import { MONO_DARK, MONO_LIGHT } from "@/lib/shiki-theme"

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: { includeProcessedMarkdown: { output: "function", headingIds: false } },
    mdxOptions: applyMdxPreset({
      rehypeCodeOptions: { themes: { light: MONO_LIGHT, dark: MONO_DARK } },
    }),
  },
})

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
})
