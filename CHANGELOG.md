# Changelog

All notable changes to this project will be documented in this file.

## Unreleased
- Created the initial Codex-optimized project scaffold.
- Added starter product, task, documentation, and verification files.
- Imported the outbound AI calling agent PRD and converted it into project requirements, architecture, API contracts, and phased implementation tasks.
- Tightened the plan after model council review with a hackathon golden path, early security tasks, call state machine, idempotency strategy, and MVP technology defaults.
- Built the first runnable MVP stack with Next.js, Tailwind, Vitest, upload parsing, campaign dashboard, simulated callbacks, CSV export, Plivo AudioStream XML, and Railway-ready voice bridge skeleton.
- Added Windows setup/verify scripts, Supabase-compatible schema, Vercel/Railway deployment configs, and Hindi-first sample CSV data.
- Cleaned the npm audit to zero reported vulnerabilities and verified lint, tests, and production build.
- Made uploads more forgiving for phone-only spreadsheets, added a sample mobile upload file and manual one-number quick-check flow, removed mobile page-level horizontal scrolling, and strengthened the voice agent's mid-call language switching instructions.
- Wired campaign start into a real Plivo outbound-call path, added provider selection in the dashboard, persisted outbound provider call IDs locally, and surfaced clear preflight errors when public callback or voice-bridge settings are missing.
- Added OpenAI Responses API transcript analysis for live calls, with deterministic fallback classification when the API key, model response, or network path is unavailable.
- Fixed Vercel serverless demo uploads failing with `ENOENT ... /var/task/.data` by moving the file-backed campaign store to a writable temp directory at runtime.
- Added Render deployment support for the voice bridge, including a `render.yaml` blueprint and an HTTP health-check path alongside the WebSocket stream endpoint.
- Upgraded the live Plivo voice path so calls stay alive, the agent speaks first, recording callbacks persist recording URLs, stream and hangup webhooks update live call status, and the dashboard surfaces clearer live-call remarks, language, and next-action data.
- Defaulted live calling branding to `UDS`, added UI-editable prompt variables for company and asset wording, made the spoken opener sound more natural, and sped up explicit-request language switching in the realtime bridge.
- Added dashboard-controlled agent settings for future calls, including Indian female and male OpenAI Realtime voice presets, tone, prompt enhancement, self-improve guidance, call setting snapshots, receiver attitude notes, and expandable transcript/status history.
- Fixed quick number check campaign creation so it copies the selected dashboard campaign's saved agent settings, prompt labels, provider mode, and default language into the one-contact campaign payload.
- Closed the local TASKS backlog with provider adapter scaffolds, call audit/idempotency helpers, confidence persistence, retry policy and retry API, campaign creation API, result filters, call detail page, Hindi script pack, language seed SQL, Excel demo sample, voice bridge smoke scripts, security data policy, and upload-to-export golden-path coverage.
