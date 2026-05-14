export interface JiraResult {
  success: boolean;
  issueKey?: string;
  issueUrl?: string;
  error?: string;
}

export async function createJiraIssue(opts: {
  jiraUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType: string;
  summary: string;
  description: string;
}): Promise<JiraResult> {
  const { jiraUrl, email, apiToken, projectKey, issueType, summary, description } = opts;
  const base = jiraUrl.replace(/\/$/, "");
  const url = `${base}/rest/api/2/issue`;
  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary,
          description,
          issuetype: { name: issueType },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `Jira ${res.status}: ${text.slice(0, 300)}` };
    }

    const data = await res.json() as { key?: string; self?: string };
    const issueKey = data.key ?? "";
    return {
      success: true,
      issueKey,
      issueUrl: issueKey ? `${base}/browse/${issueKey}` : undefined,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testJiraConnection(opts: {
  jiraUrl: string;
  email: string;
  apiToken: string;
}): Promise<{ success: boolean; displayName?: string; error?: string }> {
  const { jiraUrl, email, apiToken } = opts;
  const base = jiraUrl.replace(/\/$/, "");
  const url = `${base}/rest/api/2/myself`;
  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json() as { displayName?: string };
    return { success: true, displayName: data.displayName };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
