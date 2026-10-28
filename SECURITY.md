# Security policy

## Reporting

Report vulnerabilities privately through [GitHub security advisories](https://github.com/FindMalek/findplate/security/advisories/new). Do not open a public issue or pull request for them.

You get a first reply within a few days. Once a fix is released the advisory is published and you are credited if you want to be.

## Supported versions

Only the latest published `findplate` release on npm gets fixes. Projects you already generated are yours, so update their dependencies the usual way.

## Scope

In scope:

- the `findplate` cli (`packages/cli`), including what it writes to disk and the commands it runs
- the project template in `template/` and any insecure default it generates (auth, headers, secrets handling)
- the release and CI workflows in `.github/`

Out of scope:

- vulnerabilities in third party packages with no exploitable path through findplate (report those upstream, dependabot tracks them here)
- issues that need a modified or already compromised machine
- the docs site content, unless it leaks a secret
