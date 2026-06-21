import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-auth",
    "@better-auth/kysely-adapter",
    "kysely",
    "pg",
    "postgres",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
    ],
  },
  allowedDevOrigins: [
    "share-imagine-ongoing-tar.trycloudflare.com"
  ]
}
export default nextConfig
