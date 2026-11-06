# GUH 2026 setup (teammates)

The repo, Supabase, Vercel and API keys are already set up. You just need to get it running on your laptop. Takes about 15 minutes.

Live site: see the group chat. Every push to `main` updates it automatically in about a minute.

## 1. Install (once)
- [ ] Node.js LTS: https://nodejs.org

## 2. Get the repo running
```
git clone https://github.com/Geomaniac15/guh-2026.git
cd guh-2026
npm install
```
- [ ] Create a file called `.env.local` in the `guh-2026` folder and paste in the keys George DMs you
- [ ] Run `npm run dev` and open http://localhost:3000
- [ ] Sign up with your real email (fake ones like test@gmail.com get rejected) and check the dashboard loads

Never commit `.env.local` or paste the keys anywhere public. It's already in `.gitignore`, so `git add .` won't pick it up.

## 3. How the repo works
- `app/` each folder is a page: `app/dashboard/page.tsx` is `/dashboard`
- `app/api/` the backend. Anything using a secret key goes here
- `components/` reusable UI pieces
- `lib/ai.ts` call Claude with `ask(prompt)`
- `lib/voice.ts` text to speech with `speak(text)`
- `CLAUDE.md` rules the AI follows. Claude Code reads it automatically; in Cursor, mention it in your first prompt

## 4. Saturday plan??
Hacking is 12:00 to 18:00 only, no late submissions.

| Time | What |
|---|---|
| 11:00 | Opening ceremony: write down every challenge track and prize |
| 11:45 | Pick one idea that hits 2 to 4 tracks. Decide the 60-second demo first |
| 12:00 | Split work by page/folder, one person each. Start building |
| Every hour | Commit what works, push, check the live URL |
| 14:00 | Core demo path should work end to end, even if ugly |
| 16:00 | One person moves to Devpost, pitch and demo video |
| 16:30 | Feature freeze. Bug fixes and polish only |
| 17:30 | Submit (don't wait for 18:00) |
| 18:30 | Judging: everyone can explain how it works |

## 5. Git survival guide
- Before starting each task: `git pull`
- When something works: `git add . && git commit -m 'working: X' && git push`
- AI broke everything? `git reset --hard HEAD` goes back to your last commit
- Push rejected? Run `git pull`, then push again
- Merge conflict you don't understand? Shout. Don't let the AI guess
- Stuck for 20 minutes? Hardcode it. The demo matters more than the plumbing