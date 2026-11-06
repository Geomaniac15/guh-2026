# GUH 2026

GreatUniHack 2026 project. Rewrite this README for Devpost on Saturday: problem, solution, how it works, tech stack, team.

## Run locally
```
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```
Open http://localhost:3000.

## What's included
- `/` landing page
- `/login` email + password sign up / log in (Supabase)
- `/dashboard` protected page with an 'Ask Claude' test box
- `/api/test` server endpoint that calls Claude
- `lib/ai.ts` `ask(prompt)` helper, `lib/voice.ts` `speak(text)` ElevenLabs helper

## Stack
Next.js 16, TypeScript, Tailwind, Supabase, Anthropic API, ElevenLabs, deployed on Vercel.

See `CLAUDE.md` for the rules the AI follows and `SETUP.md` for the team checklist.
