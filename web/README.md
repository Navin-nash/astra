# Astra — Web

Next.js 16 frontend for Astra. Handles GitHub OAuth via Better Auth, repo selection, and public portfolio rendering. All AI processing is delegated to the Rust API.

See the [root README](../README.md) for full project setup.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Better Auth (GitHub OAuth)
- Framer Motion
- next-mdx-remote (portfolio rendering)
- Geist font

## Key directories

```
src/
├── app/
│   ├── api/auth/[...all]/  Better Auth handler
│   ├── [username]/         Public portfolio page (SSR)
│   ├── dashboard/          Authenticated user flows
│   └── page.tsx            Landing page
├── lib/
│   ├── auth.ts             Better Auth server config
│   ├── auth-client.ts      useSession / signIn / signOut
│   └── rust-api.ts         Server-side Rust API client
└── components/
    ├── home/               Landing page sections
    ├── layout/             Nav + footer
    └── ui/                 shadcn/ui components
```

## Dev commands

```bash
bun dev          # Start development server at localhost:3000
bun run build    # Type-check + production build
bun start        # Serve production build
bun run lint     # ESLint
```

## Environment variables

Copy and fill in `web/.env.local`:

```env
DATABASE_URL=postgres://astra:astra_dev@localhost:5432/astra
NEXT_PUBLIC_APP_URL=http://localhost:3000
RUST_API_URL=http://localhost:8080
JWT_SECRET=<must-match-api-env>
GITHUB_CLIENT_ID=<github-oauth-app-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-app-client-secret>
BETTER_AUTH_SECRET=<random-secret>
```

## Auth flow

1. User clicks "Sign in with GitHub" → `authClient.signIn.social({ provider: "github" })`
2. Better Auth handles OAuth at `/api/auth/callback/github`
3. Session stored in Postgres (`session` + `account` tables managed by Better Auth)
4. GitHub OAuth token stored in `account.access_token` by Better Auth
5. Server actions read the session via `auth.api.getSession()`, fetch repo content, then call the Rust API with a short-lived HS256 JWT
