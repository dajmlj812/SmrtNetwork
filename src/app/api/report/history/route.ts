import { NextRequest, NextResponse } from "next/server";
import { listReportHistory, getReportById } from "@/lib/report-history";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const report = getReportById(id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    return new NextResponse(report.html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json(listReportHistory());
}
