import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts an absolute file URL (e.g. http://localhost:8080/files/...)
 * to a relative path (/files/...) so it routes through the Next.js proxy.
 * Required when the API server is not directly accessible from the browser.
 */
export function toProxiedUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

/**
 * Formats a duration in seconds to HH:MM:SS or MM:SS format.
 * e.g. 754 → "12:34", 3754 → "1:02:34"
 */
export function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Formats a duration in seconds to a human-readable string.
 * e.g. 3754 → "1h 2m 34s", 94 → "1m 34s", 45 → "45s"
 */
export function formatDuration(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Highlights a query term within text by wrapping it in a <mark> tag.
 * Returns plain text if no match.
 */
export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    "<mark>$1</mark>"
  );
}

/**
 * Converts a video file URL to a streaming proxy URL.
 * Routes through /api/video which handles HTTP Range requests
 * for proper video seeking and streaming.
 */
export function toVideoStreamUrl(url: string | null | undefined): string {
  if (!url) return "";
  const path = toProxiedUrl(url); // strip host → /files/...
  return `/api/video?url=${encodeURIComponent(path)}`;
}

/**
 * Truncates text to maxLength characters, appending "..." if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
