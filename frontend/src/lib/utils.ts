/**
 * Utility helpers shared across the NeuroTwin frontend.
 * @module utils
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names with deduplication.
 * Combines `clsx` conditional logic with `tailwind-merge` conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
