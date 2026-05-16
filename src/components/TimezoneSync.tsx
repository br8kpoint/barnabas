"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateDetectedTimezone } from "@/app/actions";

export function TimezoneSync({ currentTimezone }: { currentTimezone: string }) {
  const router = useRouter();
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== currentTimezone) {
      updateDetectedTimezone(detected)
        .then(() => router.refresh())
        .catch(() => {});
    }
  }, [currentTimezone, router]);
  return null;
}
