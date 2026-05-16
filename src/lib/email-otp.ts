import { createHash, randomInt } from "crypto";
import { Resend } from "resend";
import { getAdminSupabase } from "@/lib/supabase/admin";

const TTL_MS = 60 * 60 * 1000;

function hashCode(email: string, code: string): string {
  return createHash("sha256")
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex");
}

export async function issueEmailOtp(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const code = String(randomInt(100000, 1000000));
  const codeHash = hashCode(normalized, code);
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from("email_otp_codes")
    .upsert(
      { email: normalized, code_hash: codeHash, expires_at: expiresAt },
      { onConflict: "email" },
    );
  if (error) throw error;

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { error: emailError } = await resend.emails.send({
    from: process.env.REMINDER_FROM_EMAIL!,
    to: normalized,
    subject: "Your Barnabas sign-in code",
    html: `<h2>Sign in to Barnabas</h2>
<p>Enter this 6-digit code on the sign-in page:</p>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: monospace; padding: 12px 20px; background: #f4f4f5; border-radius: 8px; display: inline-block;">${code}</p>
<p style="color: #6b7280; font-size: 13px; margin-top: 24px;">This code expires in 1 hour. If you didn't request it, you can safely ignore this email.</p>`,
  });
  if (emailError) throw emailError;
}

export async function consumeEmailOtp(
  email: string,
  code: string,
): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const codeHash = hashCode(normalized, code);

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("email_otp_codes")
    .select("expires_at")
    .eq("email", normalized)
    .eq("code_hash", codeHash)
    .maybeSingle();
  if (error || !data) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  await supabase.from("email_otp_codes").delete().eq("email", normalized);
  return true;
}
