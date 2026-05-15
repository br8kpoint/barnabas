// One-off: run the YouTube playlist sync locally.
//   pnpm sync:playlist    (or)   npm run sync:playlist
//
// Useful for the initial backfill of all videos AJay has already published.
// Requires YOUTUBE_API_KEY, YOUTUBE_PLAYLIST_ID, and SUPABASE_SERVICE_ROLE_KEY.

import { syncPlaylist } from "../src/lib/sync";

syncPlaylist()
  .then((r) => {
    console.log("Sync complete:", r);
    if (r.newlyAvailableDays.length) {
      console.log("Newly available days:", r.newlyAvailableDays.join(", "));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
