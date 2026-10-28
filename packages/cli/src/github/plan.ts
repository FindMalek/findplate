/** What `findplate github` does, as plain data: the executor runs it, `--dry-run` prints it, tests read it. */

export type Stdin = { text: string } | { env: string } | { ghToken: true } | { var: string }

export interface RunCommand {
  kind: "run"
  cmd: "gh" | "git"
  /** `${name}` is replaced by a value an earlier command captured. */
  args: string[]
  stdin?: Stdin
  /** Keep trimmed stdout under this name for later commands. */
  capture?: string
  /** An error matching this means the thing already exists, which counts as done. */
  okIf?: RegExp
  /** Skip when this captured value is non-empty. */
  skipIf?: string
}

export interface WriteCommand {
  kind: "write"
  path: string
  content: string
}

export type Command = RunCommand | WriteCommand

export interface PlanStep {
  id: string
  title: string
  /** A failure is reported and the plan goes on (plan limits, missing token scopes). */
  optional?: boolean
  commands: Command[]
}

export interface PlanInput {
  owner: string
  repo: string
  description: string
  homepage?: string
  visibility: "private" | "public"
  /** `gh config get git_protocol`; decides the remote url so pushes use the credentials the user has. */
  protocol?: "ssh" | "https"
  project: boolean
  /** Store your gh token as PROJECT_TOKEN. Off by default: it carries every scope you logged in with. */
  projectToken?: boolean
  /** `owner/number` of a project to copy instead of building the board from scratch. */
  projectTemplate?: string
  /** Names in .env that have a value. Values are never part of the plan. */
  envKeys: string[]
  milestones?: string[]
}

export const STATUSES = [
  { name: "Backlog", color: "GRAY" },
  { name: "Ready", color: "BLUE" },
  { name: "In progress", color: "YELLOW" },
  { name: "In review", color: "PURPLE" },
  { name: "Done", color: "GREEN" },
] as const

export const LABELS = [
  { name: "bug", color: "d73a4a", description: "Something is broken" },
  { name: "feature", color: "0e8a16", description: "Something new for users" },
  { name: "task", color: "5319e7", description: "Chore, refactor or internal work" },
  { name: "docs", color: "0075ca", description: "Documentation" },
  { name: "blocked", color: "b60205", description: "Waiting on something" },
  { name: "p0", color: "b60205", description: "Drop everything" },
  { name: "p1", color: "d93f0b", description: "Next up" },
  { name: "p2", color: "fbca04", description: "When there is time" },
] as const

export const DEFAULT_MILESTONES = ["Foundation", "Launch", "Later"]

/** Statuses the repo's workflows must see pass before anything merges to main. */
export const REQUIRED_CHECKS = ["ci", "attribution, issue link, commit format"]

const SECRET_NAME = /SECRET|KEY|TOKEN|PASSWORD/i
/** Local-only values that mean nothing in CI. */
const LOCAL_ONLY = /^(POSTGRES_|DATABASE_URL$)/

export function classifyEnv(keys: string[]): { secrets: string[]; variables: string[] } {
  const usable = keys.filter((key) => !LOCAL_ONLY.test(key))
  return {
    secrets: usable.filter((key) => SECRET_NAME.test(key) && !key.startsWith("NEXT_PUBLIC_")),
    variables: usable.filter((key) => !SECRET_NAME.test(key) || key.startsWith("NEXT_PUBLIC_")),
  }
}

export function rulesetBody(): string {
  return JSON.stringify({
    name: "main",
    target: "branch",
    enforcement: "active",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    bypass_actors: [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "always" }],
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: false,
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: false,
          required_status_checks: REQUIRED_CHECKS.map((context) => ({ context })),
        },
      },
    ],
  })
}

export const remoteUrl = (slug: string, protocol: PlanInput["protocol"] = "https") =>
  protocol === "ssh" ? `git@github.com:${slug}.git` : `https://github.com/${slug}.git`

const gh = (args: string[], extra: Partial<RunCommand> = {}): RunCommand => ({ kind: "run", cmd: "gh", args, ...extra })
const git = (args: string[], extra: Partial<RunCommand> = {}): RunCommand => ({
  kind: "run",
  cmd: "git",
  args,
  ...extra,
})

function statusMutation(): string {
  const options = STATUSES.map(({ name, color }) => `{name: "${name}", color: ${color}, description: ""}`).join(", ")
  return `mutation { updateProjectV2Field(input: {fieldId: "\${statusFieldId}", singleSelectOptions: [${options}]}) { projectV2Field { ... on ProjectV2SingleSelectField { id } } } }`
}

function projectStep(input: PlanInput): PlanStep {
  const { owner, repo } = input
  const title = input.repo
  const [templateOwner, templateNumber] = input.projectTemplate?.split("/") ?? []
  const make = templateNumber
    ? gh(
        [
          "project",
          "copy",
          templateNumber,
          "--source-owner",
          templateOwner ?? owner,
          "--target-owner",
          owner,
          "--title",
          title,
          "--format",
          "json",
          "--jq",
          ".number",
        ],
        { capture: "projectNumber", skipIf: "projectNumber" },
      )
    : gh(["project", "create", "--owner", owner, "--title", title, "--format", "json", "--jq", ".number"], {
        capture: "projectNumber",
        skipIf: "projectNumber",
      })
  return {
    id: "project",
    title: templateNumber ? `Copy project ${input.projectTemplate} as the board` : "Create the project board",
    optional: true,
    commands: [
      gh(
        [
          "project",
          "list",
          "--owner",
          owner,
          "--format",
          "json",
          "--jq",
          `.projects[] | select(.title == "${title}") | .number`,
        ],
        { capture: "projectNumber" },
      ),
      make,
      gh(["project", "link", "${projectNumber}", "--owner", owner, "--repo", `${owner}/${repo}`], {
        okIf: /already/i,
      }),
      ...(templateNumber
        ? []
        : [
            gh(
              [
                "project",
                "field-list",
                "${projectNumber}",
                "--owner",
                owner,
                "--format",
                "json",
                "--jq",
                '.fields[] | select(.name == "Status") | .id',
              ],
              { capture: "statusFieldId" },
            ),
            gh(["api", "graphql", "-f", `query=${statusMutation()}`]),
          ]),
    ],
  }
}

export function buildPlan(input: PlanInput): PlanStep[] {
  const { owner, repo } = input
  const slug = `${owner}/${repo}`
  const { secrets, variables } = classifyEnv(input.envKeys)
  const plan: PlanStep[] = [
    {
      id: "repo",
      title: `Create ${slug}`,
      commands: [
        gh(
          [
            "repo",
            "create",
            slug,
            `--${input.visibility}`,
            "--description",
            input.description,
            ...(input.homepage ? ["--homepage", input.homepage] : []),
          ],
          { okIf: /already exists/i },
        ),
        git(["remote", "add", "origin", remoteUrl(slug, input.protocol)], { okIf: /already exists/i }),
        gh([
          "repo",
          "edit",
          slug,
          "--description",
          input.description,
          ...(input.homepage ? ["--homepage", input.homepage] : []),
          "--delete-branch-on-merge",
        ]),
      ],
    },
    { id: "push", title: "Push the first commit", commands: [git(["push", "-u", "origin", "main"])] },
    {
      id: "labels",
      title: "Create labels",
      commands: LABELS.map((label) =>
        gh([
          "label",
          "create",
          label.name,
          "--repo",
          slug,
          "--color",
          label.color,
          "--description",
          label.description,
          "--force",
        ]),
      ),
    },
    {
      id: "milestones",
      title: "Create milestones",
      commands: (input.milestones ?? DEFAULT_MILESTONES).map((name) =>
        gh(["api", `repos/${slug}/milestones`, "-f", `title=${name}`], { okIf: /already_exists/ }),
      ),
    },
    {
      id: "codeowners",
      title: "Add CODEOWNERS",
      commands: [
        { kind: "write", path: ".github/CODEOWNERS", content: `* @${owner}\n` },
        git(["add", ".github/CODEOWNERS"]),
        git(["commit", "-m", "chore(repo): add codeowners"], { okIf: /nothing (added )?to commit/i }),
        git(["push", "origin", "main"]),
      ],
    },
  ]
  if (input.project) plan.push(projectStep(input))
  const settings: Command[] = [
    ...(input.project
      ? [gh(["variable", "set", "PROJECT_NUMBER", "--repo", slug], { stdin: { var: "projectNumber" } })]
      : []),
    ...(input.project && input.projectToken
      ? [gh(["secret", "set", "PROJECT_TOKEN", "--repo", slug], { stdin: { ghToken: true } })]
      : []),
    ...variables.map((key) => gh(["variable", "set", key, "--repo", slug], { stdin: { env: key } })),
    ...secrets.map((key) => gh(["secret", "set", key, "--repo", slug], { stdin: { env: key } })),
  ]
  plan.push(
    { id: "settings", title: "Set repo variables and secrets from .env", optional: true, commands: settings },
    {
      id: "ruleset",
      title: "Protect main: pull request and passing checks",
      optional: true,
      commands: [
        gh(["api", `repos/${slug}/rulesets`, "--jq", '.[] | select(.name == "main") | .id'], { capture: "rulesetId" }),
        gh(["api", `repos/${slug}/rulesets`, "--method", "POST", "--input", "-"], {
          stdin: { text: rulesetBody() },
          skipIf: "rulesetId",
        }),
      ],
    },
  )
  return plan
}

function showStdin(stdin: Stdin): string {
  if ("env" in stdin) return `< $${stdin.env} from .env`
  if ("ghToken" in stdin) return "< gh auth token"
  if ("var" in stdin) return `< \${${stdin.var}}`
  return "< (json body)"
}

const quote = (arg: string) => (/^[\w@%+=:,./${}-]+$/.test(arg) ? arg : JSON.stringify(arg.split("\n")[0]))

/** The plan as text for `--dry-run`. Secret values are never read, only named. */
export function formatPlan(plan: PlanStep[]): string {
  return plan
    .flatMap((step, index) => [
      `${index + 1}. ${step.title}${step.optional ? " (optional)" : ""}`,
      ...step.commands.map((command) =>
        command.kind === "write"
          ? `   write ${command.path}`
          : `   ${command.cmd} ${command.args.map(quote).join(" ")}${command.stdin ? ` ${showStdin(command.stdin)}` : ""}${command.skipIf ? `  # unless ${command.skipIf} is set` : ""}`,
      ),
    ])
    .join("\n")
}
