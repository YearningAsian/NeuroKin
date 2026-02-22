"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mood check-in has been merged into the Journal page.
 * This route redirects for backward compatibility.
 */
export default function MoodRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/journal");
  }, [router]);
  return null;
}
