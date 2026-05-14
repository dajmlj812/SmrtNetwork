export interface ServiceNowResult {
  success: boolean;
  incidentNumber?: string;
  sysId?: string;
  error?: string;
}

export async function createServiceNowIncident(opts: {
  instanceUrl: string;
  username: string;
  password: string;
  shortDescription: string;
  description: string;
  assignmentGroup?: string;
  category?: string;
  cmdbCi?: string;
}): Promise<ServiceNowResult> {
  const { instanceUrl, username, password, shortDescription, description, assignmentGroup, category, cmdbCi } = opts;

  const base = instanceUrl.replace(/\/$/, "");
  const url = `${base}/api/now/table/incident`;
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const body: Record<string, string> = {
    short_description: shortDescription,
    description,
    impact: "2",
    urgency: "2",
  };
  if (assignmentGroup) body.assignment_group = assignmentGroup;
  if (category) body.category = category;
  if (cmdbCi) body.cmdb_ci = cmdbCi;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `ServiceNow ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json() as { result?: { number?: string; sys_id?: string } };
    return {
      success: true,
      incidentNumber: data.result?.number,
      sysId: data.result?.sys_id,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testServiceNowConnection(opts: {
  instanceUrl: string;
  username: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const { instanceUrl, username, password } = opts;
  const base = instanceUrl.replace(/\/$/, "");
  const url = `${base}/api/now/table/sys_properties?sysparm_limit=1&sysparm_fields=name`;
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
