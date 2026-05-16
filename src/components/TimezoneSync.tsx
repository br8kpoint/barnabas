"use client";

import { useEffect } from "react";
import { updateDetectedTimezone } from "@/app/actions";

export function TimezoneSync({ currentTimezone }: { currentTimezone: string }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== currentTimezone) {
      updateDetectedTimezone(detected).catch(() => {});
    }
  }, [currentTimezone]);
  return null;
}
