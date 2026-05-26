# Architecture Decision Records

Use this file to capture important technical decisions.

## ADR Format

```md
## ADR-000: Decision Title

- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded

### Context
What problem, constraint, or tradeoff led to this decision?

### Decision
What decision was made?

### Consequences
What becomes easier, harder, or intentionally out of scope because of this decision?
```

## ADR-001: Create Codex-Optimized Project Scaffold

- Date: 2026-05-26
- Status: Accepted

### Context
The repository needs a consistent structure for Codex-guided implementation, documentation, testing, and verification.

### Decision
Create `AGENTS.md`, product documents, documentation folders, source and test folders, and stack-aware setup and verification scripts.

### Consequences
Future work has a clear workflow and place for product requirements, tasks, architecture notes, tests, and release history.

## ADR-002: Use Provider-Agnostic Telephony Adapter

- Date: 2026-05-26
- Status: Accepted

### Context
The product must support outbound calling providers such as Plivo, Twilio, and Exotel. Provider APIs differ in call creation, webhook payloads, recordings, and voice response formats.

### Decision
Create one internal telephony adapter interface and keep provider-specific behavior behind adapter implementations. Implement Plivo first and scaffold Twilio and Exotel.

### Consequences
The MVP can demo with one provider while preserving a clear path to additional India-focused providers. Extra abstraction is limited to the provider boundary, where the variation is real.

## ADR-003: Prefer Webhook-Driven Call State

- Date: 2026-05-26
- Status: Accepted

### Context
Outbound calls are long-running external workflows. Serverless handlers should not wait for calls to finish.

### Decision
Store call records locally, initiate calls through the provider, and update state through idempotent provider webhook handlers and scheduled reconciliation.

### Consequences
The system fits Vercel deployment constraints and can tolerate duplicate callbacks, retries, and partial provider failures.

## ADR-004: Use Deterministic Flow Before Open-Ended Agent Behavior

- Date: 2026-05-26
- Status: Accepted

### Context
The hackathon demo needs reliable operational outcomes more than unconstrained voice-agent behavior.

### Decision
Use scripted conversation flows, deterministic status mapping, and small AI helper functions for language detection, summarization, and disposition extraction.

### Consequences
The MVP is easier to test and demo. More advanced multi-turn voice intelligence can be added after the core workflow is reliable.

## ADR-005: Default to Supabase Postgres for MVP Data

- Date: 2026-05-26
- Status: Accepted

### Context
The MVP needs relational campaign, contact, call, and event data with easy hosted deployment.

### Decision
Use Supabase Postgres as the default database for implementation planning.

### Consequences
The project gets a familiar Postgres model, SQL migrations, and a hosted database path. A plain managed PostgreSQL database remains compatible if Supabase is not used.

## ADR-006: Use Plivo First With Simulated Callback Fallback

- Date: 2026-05-26
- Status: Accepted

### Context
Live telephony setup can be blocked by provider onboarding, webhook routing, pricing, or approval timing.

### Decision
Implement the Plivo adapter first, but make simulated provider callbacks part of the MVP demo path.

### Consequences
The demo remains reliable even if live calling is blocked. Live Plivo calls can still provide the strongest end-to-end proof if setup is ready.

## ADR-007: Simple Admin Auth for Hackathon MVP

- Date: 2026-05-26
- Status: Accepted

### Context
The app handles phone numbers, recordings, transcripts, and exports, but the hackathon MVP does not need full enterprise access control.

### Decision
Use a simple admin-only gate for dashboard and write APIs. Provider webhooks and cron routes use signature validation or shared secrets.

### Consequences
Sensitive operational data is not left openly accessible, while implementation remains small enough for the MVP.

## ADR-008: Vitest as Default Test Stack

- Date: 2026-05-26
- Status: Accepted

### Context
The planned application stack is TypeScript and Next.js.

### Decision
Use Vitest as the default unit and integration test runner unless the scaffolded stack provides a stronger local default.

### Consequences
Domain helpers, provider mapping, upload parsing, and route behavior can be tested quickly without heavy setup.

## ADR-009: Simulated Transcript First, Live STT Second

- Date: 2026-05-26
- Status: Accepted

### Context
The demo needs transcript, summary, and disposition output, but live STT/transcription setup can add provider-specific complexity.

### Decision
Support simulated transcript input for the demo path first. Store recording URLs from live calls when available. Add provider transcription or STT integration behind the AI service boundary after core call state is reliable.

### Consequences
The MVP can demonstrate the AI value reliably while preserving a clean path to live transcription.
