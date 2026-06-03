import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_API_URL || "http://localhost:8080";

/**
 * Video streaming proxy with HTTP Range support.
 *
 * Usage: GET /api/video?url=/files/path/to/video.mp4
 *
 * Proxies to FastAPI backend and properly handles Range requests
 * so browsers can stream and seek through video files.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Construct the backend URL
  const backendUrl = `${BACKEND_BASE}${url.startsWith("/") ? "" : "/"}${url}`;

  // Forward Range header if present
  const headers: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) {
    headers["Range"] = range;
  }

  try {
    const upstream = await fetch(backendUrl, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Backend returned ${upstream.status}`, {
        status: upstream.status,
      });
    }

    // Build response headers
    const responseHeaders = new Headers();
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "no-cache");

    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Video proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch video from backend" },
      { status: 502 },
    );
  }
}
