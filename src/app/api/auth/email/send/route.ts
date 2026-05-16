import { NextResponse } from "next/server";
import { issueEmailOtp } from "@/lib/email-otp";

export async function POST(req: Request) {
  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  try {
    await issueEmailOtp(email);
  } catch (err) {
    console.error("issueEmailOtp failed", err);
    return NextResponse.json(
      { error: "failed to send code" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
