// Reminder notifications — used by cron endpoints.
//
// Two flavors:
//   - reminder:           "Today's reading is ready, you haven't marked it done"
//   - newly-available:    "AJay just published Day N, you can pick it up"
//
// Each user can be notified via two channels independently — email (Resend)
// and web push (web-push). Per-user opt-in lives on user_profiles
// (reminder_email_optin, reminder_push_optin). At least one channel must
// be opted-in to be picked up by the cron.
//
// Idempotency:
//   Daily reminders are guarded by reminder_log (user_id, day) so a user
//   only gets nudged once for a given scheduled day, regardless of how many
//   times the cron runs that day, and regardless of which channels were used.
//   Newly-available notifications use reminder_log with the day negated.

import { Resend } from "resend";
import { getAdminSupabase } from "./supabase/admin";
import { computeCatchup, todayInTimezone } from "./schedule";
import { sendPushToUser, type PushPayload } from "./push";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "PLACEHOLDER") return null;
  return new Resend(key);
}

function fromAddress() {
  return process.env.REMINDER_FROM_EMAIL ?? "barnabas@example.com";
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// ---------------------------------------------------------------------
// Daily reminder cron entry point
// ---------------------------------------------------------------------
export async function sendDueReminders(): Promise<{
  emailsSent: number;
  pushesSent: number;
  skipped: number;
}> {
  const supabase = getAdminSupabase();
  const now = new Date();

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select(
      "user_id, display_name, timezone, start_date, reminder_hour, reminder_email_optin, reminder_push_optin, reminder_paused_until, grace_days_used",
    )
    .or("reminder_email_optin.eq.true,reminder_push_optin.eq.true")
    .not("reminder_hour", "is", null);
  if (error) throw error;
  if (!profiles?.length) return { emailsSent: 0, pushesSent: 0, skipped: 0 };

  let emailsSent = 0;
  let pushesSent = 0;
  let skipped = 0;

  for (const p of profiles) {
    try {
      const today = todayInTimezone(p.timezone, now);
      // Active pause: skip reminders entirely until the chosen return date.
      if (p.reminder_paused_until && p.reminder_paused_until > today) {
        skipped++;
        continue;
      }

      const localHour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: p.timezone,
          hour: "2-digit",
          hour12: false,
        }).format(now),
      );
      if (localHour !== p.reminder_hour) {
        skipped++;
        continue;
      }

      const { data: progressRows } = await supabase
        .from("progress")
        .select("day")
        .eq("user_id", p.user_id);
      const completedDays = (progressRows ?? []).map((r) => r.day as number);

      const state = computeCatchup({
        startDate: p.start_date,
        timezone: p.timezone,
        graceDaysUsed: p.grace_days_used,
        completedDays,
      });
      if (state.finished || state.onTrack) {
        skipped++;
        continue;
      }

      // Idempotency: one row per (user, scheduledDay).
      const guard = state.scheduledDay;
      const { data: existing } = await supabase
        .from("reminder_log")
        .select("user_id")
        .eq("user_id", p.user_id)
        .eq("day", guard)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }

      const { data: reading } = await supabase
        .from("readings")
        .select("day, passage, video_id")
        .eq("day", state.nextDay)
        .single();
      if (!reading || !reading.video_id) {
        skipped++;
        continue;
      }

      const subject = `Day ${reading.day} — ${reading.passage}`;
      const body =
        state.behindBy > 0
          ? `${state.behindBy} day${state.behindBy === 1 ? "" : "s"} behind. No shame — pick up Day ${reading.day}.`
          : `Today's read / watch: Day ${reading.day}, ${reading.passage}.`;

      // Push (in parallel-ish via the per-user helper that fans out).
      if (p.reminder_push_optin) {
        try {
          const { sent } = await sendPushToUser(p.user_id, {
            title: subject,
            body,
            url: "/dashboard",
            tag: `barnabas-day-${reading.day}`,
          });
          pushesSent += sent;
        } catch (err) {
          console.error("push send failed for", p.user_id, err);
        }
      }

      // Email.
      if (p.reminder_email_optin) {
        const resend = getResend();
        if (resend) {
          const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
          const email = authUser?.user?.email;
          if (email) {
            try {
              await resend.emails.send({
                from: fromAddress(),
                to: email,
                subject: `Barnabas: ${subject}`,
                html: reminderHtml({
                  name: p.display_name ?? "friend",
                  today,
                  nextDay: reading.day,
                  passage: reading.passage,
                  videoId: reading.video_id,
                  behindBy: state.behindBy,
                  appUrl: appUrl(),
                }),
              });
              emailsSent++;
            } catch (err) {
              console.error("email send failed for", p.user_id, err);
            }
          }
        }
      }

      await supabase.from("reminder_log").insert({ user_id: p.user_id, day: guard });
    } catch (err) {
      console.error("reminder failure for", p.user_id, err);
      skipped++;
    }
  }

  return { emailsSent, pushesSent, skipped };
}

// ---------------------------------------------------------------------
// "New day became available" fan-out (push + email)
// ---------------------------------------------------------------------
export async function notifyNewlyAvailable(days: number[]): Promise<void> {
  if (!days.length) return;
  const supabase = getAdminSupabase();

  const { data: readings } = await supabase
    .from("readings")
    .select("day, passage, video_id")
    .in("day", days);
  if (!readings?.length) return;

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select(
      "user_id, display_name, timezone, start_date, grace_days_used, reminder_email_optin, reminder_push_optin",
    );
  if (!profiles?.length) return;

  for (const r of readings) {
    if (!r.video_id) continue;
    for (const p of profiles) {
      if (!p.reminder_email_optin && !p.reminder_push_optin) continue;
      try {
        const { data: progressRows } = await supabase
          .from("progress")
          .select("day")
          .eq("user_id", p.user_id);
        const completed = (progressRows ?? []).map((row) => row.day as number);

        const state = computeCatchup({
          startDate: p.start_date,
          timezone: p.timezone,
          graceDaysUsed: p.grace_days_used,
          completedDays: completed,
        });
        if (state.nextDay !== r.day || state.finished) continue;

        const guardKey = -r.day;
        const { data: existing } = await supabase
          .from("reminder_log")
          .select("user_id")
          .eq("user_id", p.user_id)
          .eq("day", guardKey)
          .maybeSingle();
        if (existing) continue;

        const payload: PushPayload = {
          title: `Day ${r.day} is up — ${r.passage}`,
          body: "AJay just published the video you needed.",
          url: "/dashboard",
          tag: `barnabas-newly-${r.day}`,
        };

        if (p.reminder_push_optin) {
          try {
            await sendPushToUser(p.user_id, payload);
          } catch (err) {
            console.error("push newly-available failed for", p.user_id, err);
          }
        }

        if (p.reminder_email_optin) {
          const resend = getResend();
          if (resend) {
            const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
            const email = authUser?.user?.email;
            if (email) {
              try {
                await resend.emails.send({
                  from: fromAddress(),
                  to: email,
                  subject: payload.title,
                  html: newlyAvailableHtml({
                    name: p.display_name ?? "friend",
                    day: r.day,
                    passage: r.passage,
                    videoId: r.video_id,
                    appUrl: appUrl(),
                  }),
                });
              } catch (err) {
                console.error("email newly-available failed for", p.user_id, err);
              }
            }
          }
        }

        await supabase
          .from("reminder_log")
          .insert({ user_id: p.user_id, day: guardKey });
      } catch (err) {
        console.error("newly-available failure for", p.user_id, err);
      }
    }
  }
}

// ---------------------------------------------------------------------
// HTML templates
// ---------------------------------------------------------------------
function reminderHtml(args: {
  name: string;
  today: string;
  nextDay: number;
  passage: string;
  videoId: string;
  behindBy: number;
  appUrl: string;
}): string {
  const youtubeUrl = `https://www.youtube.com/watch?v=${args.videoId}`;
  const behindLine =
    args.behindBy > 0
      ? `<p>You&rsquo;re ${args.behindBy} day${args.behindBy === 1 ? "" : "s"} behind — no shame, just a nudge.</p>`
      : "";
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="font-size:20px;">Day ${args.nextDay} · ${args.passage}</h1>
      <p>Hi ${escapeHtml(args.name)},</p>
      ${behindLine}
      <p><a href="${youtubeUrl}">Watch today&rsquo;s video</a> or open
         <a href="${args.appUrl}/dashboard">Barnabas</a> to mark it complete.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:12px;color:#888;">
        ${args.today} — Barnabas Bible Reading Encouragement System.
        Turn off these nudges in <a href="${args.appUrl}/settings">Settings</a>.
      </p>
    </div>`;
}

function newlyAvailableHtml(args: {
  name: string;
  day: number;
  passage: string;
  videoId: string;
  appUrl: string;
}): string {
  const youtubeUrl = `https://www.youtube.com/watch?v=${args.videoId}`;
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="font-size:20px;">Day ${args.day} is up — ${args.passage}</h1>
      <p>Hi ${escapeHtml(args.name)},</p>
      <p>AJay just published the video you needed. <a href="${youtubeUrl}">Watch it</a>
         or <a href="${args.appUrl}/dashboard">open Barnabas</a> to keep your streak.</p>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "\"" ? "&quot;" : "&#39;",
  );
}
