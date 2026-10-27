# Changelog

All notable changes to `findplate`. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/).

## [Unreleased]

## [0.1.0]

First release of the generator: a cli that creates a full-stack project from `template/` and a set of design presets.

### Added

- `findplate create`, the v2 cli and the project template: turborepo, Next.js, oRPC, better-auth, Drizzle, shadcn (#21)
- design presets: clay, editorial, midnight, soft (#23)
- landing and docs site (#24)
- ci that generates the template and checks it (#25)
- per-user config and resumable state in the cli (#26)
- dokploy pr previews with a sticky comment (#29), plus db and s3 browsers for previews (#42)
- agent rules with ruler (#30) and project and public skills (#39)
- shared `common` package in the template (#32)
- provisioning of dokploy, s3, dns, turbo cache and backups (#33) and github provisioning (#44)
- optional modules:
  - `databuddy` analytics (#31)
  - `email` with email-sdk and Resend (#34)
  - `docs` site in the generated project (#37)
  - `umami`, `openobserve`, `glitchtip`, `infisical` and `langfuse` (#38)
  - `telegram` bot (#40)
  - `waitlist`, `roadmap` and `status` (#43)
  - `whatsapp` through Kapso (#45)
- readme and og images (#46)

[Unreleased]: https://github.com/FindMalek/findplate/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FindMalek/findplate/releases/tag/v0.1.0
