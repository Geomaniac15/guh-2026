#!/usr/bin/env bash
# Installs the official agent skills for our stack into this repo,
# for Claude Code and Cursor. Run from the repo root:
#   bash install-skills.sh
# Then commit and push so the rest of the team gets them.

AGENTS='-a claude-code -a cursor'
failed=()

install() {
  echo ''
  echo "==> $*"
  if ! npx -y skills add "$@" $AGENTS -y; then
    failed+=("$*")
  fi
}

# Next.js: no skill needed. Next 16 ships its own agent docs (AGENTS.md + node_modules/next/dist/docs)

# Supabase: auth, SSR, RLS
install supabase/agent-skills --skill supabase

# Claude API
install anthropics/skills --skill claude-api

# ElevenLabs: voice output and input
install elevenlabs/skills --skill text-to-speech --skill speech-to-text

# Firecrawl: only the 'build' skills, for calling it from app code
install firecrawl/skills --skill firecrawl-build --skill firecrawl-build-onboarding \
  --skill firecrawl-build-scrape --skill firecrawl-build-search --skill firecrawl-build-interact

echo ''
if [ ${#failed[@]} -eq 0 ]; then
  echo 'All skills installed. Now run:'
  echo "  git add . && git commit -m 'add agent skills' && git push"
else
  echo 'These failed (try running them by hand without the -y flag):'
  for f in "${failed[@]}"; do echo "  npx skills add $f"; done
fi