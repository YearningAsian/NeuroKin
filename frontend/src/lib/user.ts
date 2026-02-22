/**
 * Default user constants for demo / development mode.
 * In production these would be replaced by auth-provider session data.
 * @module user
 */

/** Default demo student ID (overridable via NEXT_PUBLIC_STUDENT_ID env var). */
export const DEMO_STUDENT_ID = process.env.NEXT_PUBLIC_STUDENT_ID || "demo-alex";

/** Default demo display name (overridable via NEXT_PUBLIC_DISPLAY_NAME env var). */
export const DEMO_DISPLAY_NAME = process.env.NEXT_PUBLIC_DISPLAY_NAME || "Alex";
