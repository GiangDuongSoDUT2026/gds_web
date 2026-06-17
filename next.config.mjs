/** @type {import('next').NextConfig} */
const API_URL = process.env.BACKEND_API_URL ?? "http://localhost:8080";
const CHATBOT_URL = process.env.CHATBOT_URL ?? "http://localhost:8002";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_URL}/api/v1/:path*`,
      },
      {
        source: "/chat/:path*",
        destination: `${CHATBOT_URL}/chat/:path*`,
      },
      // Proxy static files through Next.js so browser only needs port 3000
      {
        source: "/files/:path*",
        destination: `${API_URL}/files/:path*`,
      },
      {
        source: "/pipeline-output/:path*",
        destination: `${API_URL}/pipeline-output/:path*`,
      },
      {
        source: "/health",
        destination: `${API_URL}/health`,
      },
    ];
  },
  images: {
    remotePatterns: [
      // Local dev
      {
        protocol: "http",
        hostname: "localhost",
        port: "80",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8002",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      // Production — Google Drive keyframes
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/**",
      },
      // Production — backend VM (keyframes served via /files/*)
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_API_HOSTNAME ?? "localhost",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
