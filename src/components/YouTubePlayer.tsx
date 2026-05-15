"use client";

// Thin wrapper around the YouTube IFrame Player API.
//
// We load www.youtube.com/iframe_api once, then create a player per mounted
// instance. onEnded fires when the player reaches state PlayerState.ENDED (= 0).
//
// Notes:
//   - The API mutates window.onYouTubeIframeAPIReady — we don't fight it, just
//     register multiple init callbacks via a small ready-promise.
//   - Components that mount before the API loads queue their init until it's
//     ready, so the order of mounts doesn't matter.

import { useEffect, useRef } from "react";

type Props = {
  videoId: string;
  title?: string;
  onEnded?: () => void;
  className?: string;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          events?: {
            onStateChange?: (e: { data: number }) => void;
            onReady?: (e: { target: { destroy: () => void } }) => void;
          };
          playerVars?: Record<string, string | number>;
        },
      ) => { destroy: () => void };
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
    __ytApiReadyPromise?: Promise<void>;
  }
}

function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (window.__ytApiReadyPromise) return window.__ytApiReadyPromise;

  window.__ytApiReadyPromise = new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return window.__ytApiReadyPromise;
}

export function YouTubePlayer({ videoId, title, onEnded, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);
  const endedRef = useRef(onEnded);

  useEffect(() => {
    endedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    loadApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(host, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT!.PlayerState.ENDED) {
              endedRef.current?.();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className={className}>
      <div ref={hostRef} title={title} className="h-full w-full" />
    </div>
  );
}
