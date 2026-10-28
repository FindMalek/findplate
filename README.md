<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/grid.svg?title=findplate&subtitle=A+production-ready+full-stack+project%2C+generated+in+one+command.&align=left&mode=dark" />
    <img alt="findplate" src="https://shieldcn.dev/header/grid.svg?title=findplate&subtitle=A+production-ready+full-stack+project%2C+generated+in+one+command.&align=left&mode=light" />
  </picture>
</p>

<p align="center">
  <a href="https://github.com/FindMalek/findplate/actions/workflows/ci.yml"><img alt="build" src="https://shieldcn.dev/github/ci/FindMalek/findplate.svg?variant=secondary" /></a>
  <a href="https://www.npmjs.com/package/findplate"><img alt="npm version" src="https://shieldcn.dev/npm/findplate.svg?variant=secondary" /></a>
  <a href="https://github.com/FindMalek/findplate/blob/main/LICENSE"><img alt="license" src="https://shieldcn.dev/github/license/FindMalek/findplate.svg?variant=secondary" /></a>
  <a href="https://github.com/FindMalek/findplate/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/FindMalek/findplate.svg?variant=secondary" /></a>
  <img alt="Next.js" src="https://shieldcn.dev/badge/Next.js-16-black.svg?logo=nextdotjs&variant=secondary" />
  <img alt="TypeScript" src="https://shieldcn.dev/badge/TypeScript-5-black.svg?logo=typescript&variant=secondary" />
  <img alt="Bun" src="https://shieldcn.dev/badge/Bun-cli-black.svg?logo=bun&variant=secondary" />
</p>

One command creates a turborepo with a landing page, a dashboard with login and an api, wired to postgres, auth and typed rpc. You pick a design preset and the optional modules, and the project is yours from the first commit.

---

## Quickstart

```bash
bunx findplate create
cd my-app
pnpm db:up
pnpm dev
```

You need node 24, pnpm, docker and bun. Every prompt has a flag, so coding agents can run it with no prompts:

```bash
bunx findplate create my-app --name my-app --preset monochrome --modules storage,ai,docs -y
```

---

## What you get

| Piece | What it is |
| --- | --- |
| `apps/web` | hero landing page with a live status window |
| `apps/dashboard` | better-auth login and an app shell |
| `apps/api` | orpc on bun, the only app that touches the database |
| `apps/docs` | optional fumadocs site about your project |
| `packages/ui` | shadcn components and the preset theme tokens |
| `packages/common` | zod schemas, constants and utils shared by every app |
| `packages/orpc`, `db`, `auth`, `env` | typed rpc, drizzle, better-auth, zod-validated env |

---

## Presets and modules

| Presets | Look |
| --- | --- |
| `monochrome` | black and white, square corners |
| `editorial`, `clay`, `midnight`, `soft` | other starting points, all driven by shadcn tokens |

| Modules | Default | Adds |
| --- | --- | --- |
| `storage` | on | uploads to any S3 API |
| `ai` | on | Vercel AI SDK with Groq, OpenAI or Anthropic |
| `docs` | on | the docs site |

---

## This repo

```text
findplate/
├─ packages/cli/   the generator
├─ template/       the project it copies, with module markers
├─ presets/        design presets
└─ docs/           landing page and documentation
```

```bash
pnpm install
pnpm dev create ../demo --name demo -y --no-git   # run the cli from source
pnpm lint && pnpm check-types && pnpm test
```

CI generates a project with every module and with none, then runs lint, types, tests and build on each.

---

## Docs

Full documentation lives in `docs/`, run it with `pnpm --filter findplate-docs dev`. Name, pitch and social card colors are in `docs/lib/site.ts`.
