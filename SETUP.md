# GUH 2026 setup checklist

Goal for tonight: an empty app that is live on a public URL, with login working and every API key tested. Then Saturday is just building features.

## 1. Everyone (10 min)
- [ ] GitHub account, and send your username to the repo owner
- [ ] Install Node.js LTS (https://nodejs.org) and Git
- [ ] Install your AI tool: Claude Code (`npm install -g @anthropic-ai/claude-code`) or Cursor
- [ ] Sign up for the GitHub Student Developer Pack if you haven't (free credits for loads of tools)

## 2. Repo owner only (10 min)
The repo is already built (guh-2026.zip). Login, a protected dashboard and a Claude test endpoint are wired up.
- [ ] Unzip it, then in the folder:
  ```
  npm install
  git init -b main
  git add . && git commit -m 'boilerplate'
  ```
- [ ] Create an empty GitHub repo (no README), then follow GitHub's 'push an existing repository' commands
- [ ] Add the other three as collaborators
- [ ] Settings > Branches: make sure there are NO protection rules on `main` (we push straight to it)
- [ ] Optional: `npx shadcn@latest init` for nicer UI components

## 3. Accounts and keys (one person per service, 15 min)
Put every key in the team group chat or a shared password manager. Never in the repo.
- [ ] **Supabase:** new project, copy the Project URL and anon key (Project Settings > API). Turn on Email auth
- [ ] **Anthropic:** console.anthropic.com, create an API key, add a few pounds of credit
- [ ] **ElevenLabs:** create an API key (free tier is fine for a demo)
- [ ] **Firecrawl:** create an API key
- [ ] **Vercel:** sign in with GitHub, import the repo, add all keys under Settings > Environment Variables

## 4. Prove it works (15 min)
- [ ] Copy `.env.example` to `.env.local` and fill in the keys
- [ ] In Supabase > Authentication > Sign In / Providers > Email, turn OFF 'Confirm email' (saves time at a hackathon)
- [ ] `npm run dev`, open http://localhost:3000, sign up, go to the dashboard and press 'Ask Claude'

- [ ] Push, wait for Vercel, and check it works on the live URL
- [ ] Everyone clones the repo, creates `.env.local` with the keys, and runs it locally

## 5. Saturday plan
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

## Vibecoding rules
- Commit every time something works: `git add . && git commit -m 'working: X' && git push`
- If the AI wrecks things: `git reset --hard HEAD` goes back to the last commit
- Pull before you start each new task: `git pull`
- Stuck for 20 minutes? Hardcode it. The demo matters more than the plumbing
