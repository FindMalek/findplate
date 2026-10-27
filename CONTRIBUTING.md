# Contributing

```bash
pnpm install
pnpm dev create ../demo --name demo -y --no-git   # run the cli from source
pnpm lint && pnpm check-types && pnpm test
```

Work is tracked as [GitHub issues](https://github.com/FindMalek/findplate/issues). Branch from the issue (`gh issue develop <n> --checkout`), open a pull request that starts with `closes #<n>`.

- commits are `type(scope): subject`, scope always, subject five words or less, lowercase
- no AI attribution in commits, pull request titles or bodies
- `pnpm lint` runs biome, `pnpm check` fixes what it can

## Layout

```text
packages/cli/   the generator
template/       the project it copies, with module markers
presets/        design presets
docs/           landing page and documentation
.github/        ci, release and preview workflows
```

## Adding a module

A module is a package plus the code and env keys that depend on it. Turning it off removes all three. Follow these steps in order.

### 1. Manifest entry

Add the module to `template/findplate.json` under `modules`:

```json
"mymodule": {
  "label": "My module",
  "hint": "one line shown in the prompt",
  "default": false,
  "paths": ["packages/mymodule", "packages/orpc/src/routers/mymodule.ts"],
  "packages": ["@acme/mymodule", "some-sdk"],
  "keys": [{ "env": "MYMODULE_API_KEY", "label": "My module API key", "url": "https://example.com/keys" }],
  "requires": ["ai"]
}
```

- `paths` are deleted when the module is off
- `packages` are removed from every `package.json` and from the pnpm catalog when it is off
- `keys` are the secrets the cli can ask for or provision
- `requires` lists modules this one needs. The cli turns them on with it, and CI generates it with them
- `scripts` adds root scripts only when the module is on
- `skills` lists public agent skills installed with the module

Use `@acme` for the scope, the cli renames it.

### 2. Markers

Code outside `paths` that only makes sense with the module goes between markers:

```ts
// @findplate:mymodule
import { mymodule } from "@acme/mymodule"
// @end
```

A trailing `// @findplate:mymodule` marks one line. Markers come in four comment styles: `//`, `#`, `{/* */}` and `<!-- -->`. They cannot nest. Add the env block to `template/.env.example` the same way and put a missing key's fallback in the code, so the app still starts without it.

### 3. Tests

- the template's own tests (`pnpm test` in a generated project) cover the package's behavior
- `packages/cli/test/generate.test.ts` covers the marker stripping. Only touch it if you add marker behavior

A generated project must pass lint, types, tests and build with the module alone, with all modules and with none.

### 4. Docs

- add a page `docs/content/docs/<module>.mdx` with what it adds, env keys, how to remove it and how to swap it. Copy a short one like `docs/content/docs/databuddy.mdx`
- add it to `docs/content/docs/meta.json` and to the table in `docs/content/docs/modules.mdx`
- add a compose snippet to `docs/content/docs/self-hosted.mdx` if it needs a server

### 5. CI

Nothing to edit. The matrix in `.github/workflows/ci.yml` is built from `template/findplate.json` by `.github/scripts/module-matrix.mjs`, so your module is generated alone, and with its `requires`. Check it locally:

```bash
pnpm dev create /tmp/mymodule --name acme -y --no-git --modules mymodule
cd /tmp/mymodule && pnpm install && pnpm lint && pnpm check-types && pnpm test && pnpm build
```

## Presets

A preset is a folder in `presets/` with a `preset.json` and a `theme.css` of shadcn tokens. See the [presets page](docs/content/docs/presets.mdx).
