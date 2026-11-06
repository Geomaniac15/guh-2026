# Project rules (GreatUniHack 2026)

We have 6 hours (12:00 to 18:00, no late submissions). Speed and a working demo beat clean architecture. Follow these rules on every prompt.

## Stack (do not change or add alternatives)
- Next.js 16, App Router, TypeScript. This version differs from older Next.js: read `AGENTS.md` and the docs in `node_modules/next/dist/docs/` before using an unfamiliar API. Middleware is now `proxy.ts`
- Tailwind CSS for all UI. shadcn/ui is allowed once someone runs `npx shadcn@latest init`
- Supabase for database, auth and storage (`@supabase/ssr` and `@supabase/supabase-js`)
- Server logic lives in Next.js Route Handlers (`app/api/*/route.ts`) or Server Actions
- Deployed on Vercel from the `main` branch
- Package manager: npm

Do NOT introduce: a separate backend server, Python, Express, Prisma, Redux, another CSS framework, or another auth provider.

## Folder layout
```
app/                  pages and routes
app/api/              server endpoints (all secret API calls go here)
components/           shared UI components
components/ui/        shadcn components (generated, don't hand-edit)
lib/                  helpers and API wrappers
lib/supabase/         client.ts (browser) and server.ts (server)
lib/ai.ts             Anthropic wrapper
lib/voice.ts          ElevenLabs wrapper
proxy.ts              session refresh + protects /dashboard
```

## Code style
- Use single quotes in TypeScript/JavaScript
- Small files, one component per file
- Prefer simple, readable code over clever abstractions
- Supabase: on the server use `createClient` from `@/lib/supabase/server` and check the user with `supabase.auth.getClaims()`. In client components use `@/lib/supabase/client`
- Cache Components is on: any server component that reads cookies, auth or per-user data must be wrapped in `<Suspense>` (see `app/dashboard/page.tsx`), or the build fails
- Use TypeScript types, but `any` is acceptable if it unblocks us quickly
- Every page must handle loading and error states so the demo never shows a blank screen

## Secrets
- API keys are only ever read from `process.env` on the server
- Never put a secret in a client component or in a `NEXT_PUBLIC_` variable (except the Supabase URL and anon key, which are public by design)
- Never commit `.env.local`
- Env vars in use:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ANTHROPIC_API_KEY`
  - `ELEVENLABS_API_KEY`
  - `FIRECRAWL_API_KEY`

## Working with the team
- Four people are editing this repo at once. Only edit the files needed for the current task
- Do not reformat, rename or reorganise files you weren't asked to touch
- Do not modify `package.json` dependencies without saying so clearly in your reply
- Before finishing a task, make sure `npm run build` passes. A broken build breaks the Vercel deploy for everyone

## When things break
- If a fix takes more than two attempts, stop and suggest the simplest alternative (fake it with hardcoded data if needed for the demo)
- Explain any change in one or two sentences so we can explain it to the judges
