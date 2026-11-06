# Pre-Hackathon Suggestions

The goal is to improve reusability and reliability without committing to a specific challenge before the hackathon begins.

## Priorities

1. **Create a generic app shell**
   - Add shared layout, navigation, responsive cards, buttons, forms, loading states, error states, and empty states.

2. **Turn the dashboard into a demo workspace**
   - Provide an input panel, results panel, history, reset button, and a placeholder area for challenge-specific features.

3. **Harden the backend**
   - Validate request bodies, handle malformed JSON, enforce prompt length limits, return consistent errors, and avoid exposing provider-specific failures.

4. **Add reusable AI helpers**
   - Support structured JSON responses, system prompts, configurable models, and optionally streaming responses.

5. **Wire up voice behind a simple API route**
   - Keep ElevenLabs available without committing the user interface to a particular voice workflow.

6. **Add a health-check page or API**
   - Quickly verify Supabase, Anthropic, ElevenLabs, and deployment environment variables on hackathon morning.

7. **Improve authentication UX**
   - Confirm signup email behavior, add sign-out feedback, and handle expired sessions cleanly.

8. **Prepare a rapid customization path**
   - Document where branding, prompts, output types, and the core workflow can be changed in one or two files.

9. **Test the production path**
   - Run `npm run build`, verify the deployed URL, test on mobile, and check missing-key and other failure behavior.

## Highest-value improvement

Turn the current “Ask Claude” test box into a polished, generic **input → processing → result** framework that can be adapted to almost any challenge within an hour.
