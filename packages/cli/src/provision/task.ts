import type { Config } from "../config"

export interface Task {
  id: string
  title: string
  run: () => Promise<void>
}

export interface Ctx {
  config: Config
  dir: string
  name: string
  repo: string
  domain?: string
  envs: string[]
}
