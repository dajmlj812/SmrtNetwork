import { NextRequest, NextResponse } from "next/server";
import { listAuditLog, clearAuditLog, exportAuditLogCsv } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
  if (format === "csv") {
    const csv = exportAuditLogCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }
  return NextResponse.json(listAuditLog());
}

export async function DELETE() {
  clearAuditLog();
  return NextResponse.json({ ok: true });
}
