"use server";

import { requireUser } from "@/lib/auth-helpers";
import { getAdminSupabase } from "@/lib/supabase/admin";

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out.slice(0, 4) + "-" + out.slice(4);
}

export async function createGroup(name: string): Promise<string> {
  if (!name || name.length > 80) throw new Error("Name must be 1-80 chars");
  const user = await requireUser();
  const supabase = getAdminSupabase();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from("groups")
      .insert({ name, invite_code: code, created_by: user.id })
      .select("id")
      .single();
    if (!error && data) {
      const { error: joinErr } = await supabase
        .from("group_members")
        .insert({ group_id: data.id, user_id: user.id });
      if (joinErr) throw joinErr;
      return data.id;
    }
    if (error && (error as { code?: string }).code !== "23505") throw error;
  }
  throw new Error("Could not generate a unique invite code; please retry");
}

export async function joinGroup(code: string): Promise<string> {
  const user = await requireUser();
  const supabase = getAdminSupabase();
  const normalized = code.toUpperCase().replace(/\s+/g, "");

  const { data: group, error } = await supabase
    .from("groups")
    .select("id")
    .eq("invite_code", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!group) throw new Error("No group with that code");

  const { error: joinErr } = await supabase
    .from("group_members")
    .upsert(
      { group_id: group.id, user_id: user.id },
      { onConflict: "group_id,user_id" },
    );
  if (joinErr) throw joinErr;
  return group.id;
}

export async function leaveGroup(groupId: string) {
  const user = await requireUser();
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  if (error) throw error;
}
