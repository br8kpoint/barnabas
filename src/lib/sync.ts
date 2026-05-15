import { getAdminSupabase } from "./supabase/admin";
import { fetchPlaylistItems, indexByDay } from "./youtube";

export type SyncResult = {
  fetched: number;
  matchedDays: number;
  newlyAvailableDays: number[];
};

export async function syncPlaylist(): Promise<SyncResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const playlistId = process.env.YOUTUBE_PLAYLIST_ID;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");
  if (!playlistId) throw new Error("YOUTUBE_PLAYLIST_ID not set");

  const supabase = getAdminSupabase();

  // 1. What days currently have a video_id in the db?
  const { data: existingRows, error: existingErr } = await supabase
    .from("readings")
    .select("day, video_id")
    .not("video_id", "is", null);
  if (existingErr) throw existingErr;
  const alreadyKnown = new Set((existingRows ?? []).map((r) => r.day as number));

  // 2. Fetch playlist + index by day.
  const items = await fetchPlaylistItems({ apiKey, playlistId });
  const byDay = indexByDay(items);

  // 3. Update each matched day. Rows already exist (seeded), so a plain
  // UPDATE keeps the passage column untouched. We only stamp
  // video_first_seen_at the first time a video appears.
  const now = new Date().toISOString();
  const newlyAvailableDays: number[] = [];

  for (const [day, item] of byDay) {
    const isNew = !alreadyKnown.has(day);
    if (isNew) newlyAvailableDays.push(day);
    const patch: Record<string, unknown> = {
      video_id: item.videoId,
      video_title: item.title,
      video_published_at: item.publishedAt,
      updated_at: now,
    };
    if (isNew) patch.video_first_seen_at = now;

    const { error } = await supabase.from("readings").update(patch).eq("day", day);
    if (error) throw error;
  }

  return {
    fetched: items.length,
    matchedDays: byDay.size,
    newlyAvailableDays: newlyAvailableDays.sort((a, b) => a - b),
  };
}
