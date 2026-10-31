export interface FeedbackInput {
  message: string
  email?: string
  page?: string
}

/** Opens an issue labelled `feedback` in the project repo. Answers the issue number. */
export async function createFeedbackIssue(
  config: { repo: string; token: string; fetch?: typeof fetch },
  input: FeedbackInput,
): Promise<number> {
  const call = config.fetch ?? fetch
  const title = input.message.replace(/\s+/g, " ").trim().slice(0, 70)
  const body = [
    input.message,
    "",
    "---",
    `From: ${input.email || "anonymous"}`,
    input.page ? `Page: ${input.page}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n")
  const response = await call(`https://api.github.com/repos/${config.repo}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "findplate-feedback",
    },
    body: JSON.stringify({ title: `Feedback: ${title}`, body, labels: ["feedback"] }),
  })
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`)
  return ((await response.json()) as { number: number }).number
}
