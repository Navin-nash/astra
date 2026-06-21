"use client"

import { createAuthClient } from "better-auth/react"
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [sentinelClient({
    identifyUrl: process.env.BETTER_AUTH_IDENTIFY_URL,
  })]
})

export const { signIn, signOut, useSession } = authClient
