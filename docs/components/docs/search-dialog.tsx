"use client"

import { useDocsSearch } from "fumadocs-core/search/client"
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search"
import type { SharedProps } from "fumadocs-ui/contexts/search"
import { use } from "react"

let STATIC: Promise<typeof import("fumadocs-core/search/client/orama-static")> | undefined

function StaticSearch(props: SharedProps) {
  STATIC ??= import("fumadocs-core/search/client/orama-static")
  const client = use(STATIC).staticClient({ from: "/api/search" })
  const search = useDocsSearch({ client })
  return (
    <SearchDialog {...search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </SearchDialog>
  )
}

export default StaticSearch
