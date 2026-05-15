// YouTube playlist sync.
//
// AJay's videos are titled "Day N | Read the Bible in One Year". We pull every
// item from the playlist via the YouTube Data API v3 (paginated, 50 per call)
// and upsert each detected day into the readings table.

export type PlaylistItem = {
  videoId: string;
  title: string;
  publishedAt: string;
};

const DAY_RE = /\bDay\s+(\d{1,3})\b/i;

export function parseDayFromTitle(title: string): number | null {
  const m = title.match(DAY_RE);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 && n <= 365 ? n : null;
}

export async function fetchPlaylistItems(opts: {
  playlistId: string;
  apiKey: string;
}): Promise<PlaylistItem[]> {
  const out: PlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", opts.playlistId);
    url.searchParams.set("key", opts.apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
    }
    const json: {
      items: Array<{
        snippet: {
          title: string;
          publishedAt: string;
          resourceId: { videoId: string };
        };
      }>;
      nextPageToken?: string;
    } = await res.json();

    for (const item of json.items) {
      out.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
      });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  return out;
}

// Map playlist items to the readings table, keyed by day number.
// If two items map to the same day, the earlier publishedAt wins (deterministic).
export function indexByDay(items: PlaylistItem[]): Map<number, PlaylistItem> {
  const byDay = new Map<number, PlaylistItem>();
  for (const item of items) {
    const day = parseDayFromTitle(item.title);
    if (!day) continue;
    const existing = byDay.get(day);
    if (!existing || item.publishedAt < existing.publishedAt) {
      byDay.set(day, item);
    }
  }
  return byDay;
}
