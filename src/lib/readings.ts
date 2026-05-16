// Server-side helpers for the readings table.
import { getAdminSupabase } from "./supabase/admin";

export type Reading = {
  day: number;
  passage: string;
  video_id: string | null;
  video_title: string | null;
  video_published_at: string | null;
};

export async function getReadings(days: number[]): Promise<Reading[]> {
  if (!days.length) return [];
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("readings")
    .select("day, passage, video_id, video_title, video_published_at")
    .in("day", days)
    .order("day", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Reading[];
}

export async function getReading(day: number): Promise<Reading | null> {
  const rows = await getReadings([day]);
  return rows[0] ?? null;
}

// Parse the leading book name (or names, if multi-book day) out of a passage.
// "1 Samuel 29-31; 2 Samuel 1" -> ["1 Samuel", "2 Samuel"]
// "Genesis 11; Job 1-2"        -> ["Genesis", "Job"]
export function booksInPassage(passage: string): string[] {
  return passage
    .split(";")
    .map((p) => p.trim())
    .map((p) => p.replace(/\s+\d+(\s*[-–]\s*\d+)?$/, "").trim())
    .filter(Boolean);
}
