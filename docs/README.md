# findplate docs

Landing page and documentation for findplate. Next.js, Fumadocs, Tailwind.

```bash
pnpm --filter findplate-docs dev      # http://localhost:3000
pnpm --filter findplate-docs build
```

Pages live in `content/docs/*.mdx`, order in `content/docs/meta.json`. Theme tokens are the monochrome preset in `app/theme.css`.

## Self-host

```bash
docker build -f docs/Dockerfile -t findplate-docs .
docker run -p 3000:3000 findplate-docs
```

The build context is the repo root. On Vercel, set the root directory to `docs`.
