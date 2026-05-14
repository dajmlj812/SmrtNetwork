import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/config";

export async function POST() {
  const smtp = getSmtpConfig();

  if (!smtp.host || !smtp.user || !smtp.pass) {
    return NextResponse.json(
      { error: "SMTP is not fully configured. Set host, username, and password first." },
      { status: 400 }
    );
  }

  if (!smtp.to) {
    return NextResponse.json(
      { error: "No 'To' address configured. Set a recipient address first." },
      { status: 400 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.verify();
    await transporter.sendMail({
      from: smtp.from || smtp.user,
      to: smtp.to,
      subject: "SmrtNetwork — SMTP Test",
      html: `<p>This is a test email from <strong>SmrtNetwork</strong>.</p><p>Your SMTP configuration is working correctly.</p><p style="color:#888;font-size:12px;">Sent at ${new Date().toLocaleString()}</p>`,
      text: `SmrtNetwork SMTP Test\n\nYour SMTP configuration is working correctly.\n\nSent at ${new Date().toLocaleString()}`,
    });

    return NextResponse.json({ ok: true, to: smtp.to });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
