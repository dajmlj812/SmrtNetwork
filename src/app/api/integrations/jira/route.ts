import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { createJiraIssue, testJiraConnection } from "@/lib/jira";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action?: "test";
    deviceName?: string;
    deviceSerial?: string;
    deviceModel?: string;
    networkName?: string;
    status?: string;
    analysis?: string;
  };

  const cfg = readConfig();
  if (!cfg.jiraEnabled || !cfg.jiraUrl || !cfg.jiraEmail || !cfg.jiraApiToken || !cfg.jiraProjectKey) {
    return NextResponse.json({ error: "Jira is not configured" }, { status: 400 });
  }

  if (body.action === "test") {
    const result = await testJiraConnection({
      jiraUrl: cfg.jiraUrl,
      email: cfg.jiraEmail,
      apiToken: cfg.jiraApiToken,
    });
    return NextResponse.json(result);
  }

  const { deviceName, deviceSerial, deviceModel, networkName, status, analysis } = body;
  const summary = `Device issue: ${deviceName ?? deviceSerial ?? "Unknown"} (${deviceModel ?? ""})`;
  const description = [
    `Device: ${deviceName ?? "N/A"} (${deviceSerial ?? "N/A"})`,
    `Model: ${deviceModel ?? "N/A"}`,
    `Network: ${networkName ?? "N/A"}`,
    `Status: ${status ?? "N/A"}`,
    "",
    analysis ? `AI Diagnosis:\n${analysis}` : "No AI diagnosis available.",
    "",
    "Created by SmrtNetwork",
  ].join("\n");

  const result = await createJiraIssue({
    jiraUrl: cfg.jiraUrl,
    email: cfg.jiraEmail,
    apiToken: cfg.jiraApiToken,
    projectKey: cfg.jiraProjectKey,
    issueType: cfg.jiraIssueType ?? "Bug",
    summary,
    description,
  });

  return NextResponse.json(result);
}
