# UI and UX Design Specification

## Product
Outbound AI Calling Agent for pickup and de-installation readiness operations.

## Design Goal
Create a production-ready operations workspace where an admin can upload an Excel contact list, create a campaign, start outbound calls, monitor call progress, inspect call evidence, and export confirmed pickup or follow-up rows with confidence.

The experience should feel like an operations command center: calm, dense, reliable, and audit-friendly. It should avoid marketing-page patterns. The first screen after sign-in should be the actual campaign workspace, not a landing page.

## Primary Users
- Logistics operator: uploads sheets, starts campaigns, filters outcomes, exports pickup rows.
- Field operations manager: checks readiness counts, reviews follow-up reasons, sends engineers.
- Founder or ops lead: demos the golden path, verifies auditability, monitors provider reliability.
- Support analyst: inspects call transcripts, summaries, recordings, and manual-review calls.

## UX Principles
- Make the golden path obvious: upload, review, start, monitor, export.
- Show system state plainly. Calling systems fail in many ways, so states must be visible and explainable.
- Keep repeated work efficient. Tables, filters, bulk actions, and compact summaries matter more than decorative layouts.
- Treat call evidence as sensitive. Recordings, transcripts, raw events, and exports should feel protected.
- Prefer deterministic wording. The user should know whether a result came from provider status, transcript classification, or manual review.
- Preserve demo resilience. Simulated mode should look deliberate, not like a hidden debug fallback.

## Information Architecture

```text
/login
/campaigns
/campaigns/new
/campaigns/:id
/campaigns/:id/import
/campaigns/:id/results
/campaigns/:id/calls/:callId
/campaigns/:id/export
/settings
```

### Navigation Model
- Left sidebar on desktop with Campaigns, New Campaign, Exports, Settings.
- Bottom navigation on mobile with Campaigns, Upload, Results, Settings.
- Campaign detail pages use a sticky subnav: Overview, Calls, Import, Exports, Audit.
- Primary action button changes by context:
  - Campaign list: New campaign
  - Draft campaign: Start campaign
  - Running campaign: Export results
  - Completed campaign: Export confirmed pickups

## Visual Direction

### Tone
Industrial operations dashboard with a precise Indian logistics context. The interface should be quiet, scan-friendly, and serious, with small moments of live-call energy.

### Product Pattern
Use a SaaS admin-panel pattern, not a consumer app pattern. The product is a daily operations tool, so clarity, repeatability, and state confidence outrank visual novelty. The distinctive design moment should be the live campaign board: metric bands, event timelines, and outcome distribution bars updating in a controlled way.

### Visual Motif
Use a "dispatch board" concept:
- Dense tables and status strips.
- Timeline marks for call progress.
- Compact metric bands.
- Clear operational color coding.
- Subtle map/grid hints in backgrounds only where useful.

Avoid oversized hero sections, floating marketing cards, dark blurry stock imagery, or decorative gradients that distract from operational state.

### Color Palette
Use a neutral base with purposeful accents. Avoid a one-note blue or purple interface.

| Token | Hex | Usage |
|---|---:|---|
| `surface` | `#F7F5EF` | App background |
| `panel` | `#FFFFFF` | Tables, forms, drawers |
| `ink` | `#1F2523` | Primary text |
| `muted` | `#6C736F` | Secondary text |
| `line` | `#D8D4C8` | Borders and dividers |
| `rail` | `#28322E` | Sidebar and dark header strips |
| `accent` | `#0F766E` | Primary actions and active nav |
| `accent-strong` | `#0B5F59` | Primary hover |
| `warning` | `#B7791F` | Retry, follow-up, uncertainty |
| `danger` | `#B42318` | Failed, invalid, blocked |
| `success` | `#2F7D32` | Confirmed pickup |
| `info` | `#2F5E9E` | Live or in-progress states |

### Typography
- Use a highly readable sans for interface text.
- Use tabular numerals for counters, durations, phone numbers, and percentages.
- Prefer compact headings inside app surfaces. Reserve large type only for page titles.
- Suggested pairing after Next.js scaffold:
  - UI: `Geist Sans` or another clean production UI font.
  - Mono/data: `Geist Mono` for phone numbers, IDs, event keys, and timestamps.

### Type Scale
Use one compact type scale and do not scale font sizes with viewport width:

| Token | Size | Line Height | Usage |
|---|---:|---:|---|
| `display-sm` | 32px | 40px | Rare page-level summary only |
| `heading-lg` | 24px | 32px | Page titles |
| `heading-md` | 20px | 28px | Section titles |
| `body-lg` | 16px | 24px | Main body and form fields |
| `body-md` | 14px | 20px | Table cells and secondary text |
| `label-sm` | 12px | 16px | Badges, labels, metadata |
| `mono-sm` | 13px | 20px | Phone numbers, IDs, timestamps |

### Density
- Desktop is optimized for scanning 20 to 50 rows at once.
- Mobile is optimized for triage, not full spreadsheet editing.
- Cards should be used for repeated campaign summaries, call details, and modal content only. Do not nest cards.

### Spacing and Shape
- Use a 4px base spacing scale with common steps: 4, 8, 12, 16, 24, 32, 48.
- Keep app surfaces at 6px to 8px radius.
- Icon buttons must reserve at least a 44px by 44px hit area even when the visible icon is smaller.
- Tables use 12px horizontal cell padding on desktop and 16px outer gutters on mobile.
- Sticky headers and bottom bars must reserve space so content is never hidden beneath them.

### Elevation and Layers
Use a small, explicit layer scale:

| Layer | z-index | Usage |
|---|---:|---|
| Base | 0 | Page content |
| Sticky | 20 | Table headers, campaign subnav |
| Overlay | 40 | Drawers, filter sheets |
| Modal | 80 | Confirmation dialogs |
| Toast | 100 | Non-blocking feedback |

Shadows should be restrained and functional. Use borders first, shadows only where depth clarifies an overlay or sticky element.

## Core Workflows

## 1. Sign In

### Purpose
Protect sensitive recordings, transcripts, phone numbers, exports, and write APIs.

### Layout
- Centered sign-in panel on a neutral background.
- Product name, short operational description, password or magic-link field depending on auth choice.
- No public campaign data before authentication.

### States
- Loading: disable submit and show inline progress.
- Error: clear message without revealing auth internals.
- Session expired: send user back with "Session expired. Sign in again to continue."

## 2. Campaign List

### Purpose
Let admins see all campaign batches and quickly resume work.

### Desktop Layout
- Header row with page title, New campaign button, global search.
- Metric strip:
  - Active campaigns
  - Calls today
  - Confirmed pickups
  - Manual review
- Campaign table:
  - Name
  - Provider
  - Status
  - Contacts
  - Completion
  - Confirmed
  - Follow-up
  - Last update
  - Actions

### Mobile Layout
- Campaigns become compact rows with status, completion bar, and one action menu.
- Metrics become horizontal scroll chips.

### Empty State
Show a direct action: "Create campaign" and a secondary "Download sample Excel" when sample data exists.

## 3. New Campaign and Upload

### Purpose
Convert an Excel sheet into a draft campaign with visible validation.

### Stepper
Use a 4-step horizontal stepper on desktop and compact vertical stepper on mobile:
1. Upload file
2. Map and validate
3. Campaign settings
4. Review and start

### Upload File Screen
Controls:
- Drag-and-drop upload zone.
- Browse file button.
- Sample template download.
- Accepted format text: `.xlsx` or `.csv` if CSV is later supported.

Validation:
- File missing
- Unsupported file type
- Empty sheet
- Too many rows for demo limit
- Missing required columns

### Column Validation Screen
Required columns:
- `provider_name`
- `phone`
- `location`
- `machine_count`
- `order_id`

Optional columns:
- `language_hint`
- `alternate_phone`
- `address`

UI:
- Validation summary at top: Imported, Invalid rows, Duplicates skipped.
- Table preview with row-level badges.
- Invalid rows drawer with row number, field, current value, and reason.
- Duplicate rows grouped by phone and order ID.

### Campaign Settings Screen
Fields:
- Campaign name
- Company name for call greeting
- Telephony provider: Plivo, Twilio, Exotel, Simulated
- Default language
- Retry limit
- Calling window
- Recording enabled toggle if provider supports it
- Demo mode toggle when simulated callbacks are enabled

Provider selection should use segmented controls or radio cards with provider status:
- Ready
- Missing credentials
- Scaffolded only
- Demo only

### Review and Start Screen
Show a concise readiness checklist:
- Contacts imported
- Required columns valid
- Provider configured
- Webhook secret configured
- Demo fallback available

Primary action:
- Save draft
- Start campaign

If the provider is not live-ready, the start action should clearly indicate "Start simulated campaign" instead of pretending live calls will run.

## 4. Campaign Overview Dashboard

### Purpose
Show campaign health, progress, and outcomes in one view.

### Header
- Campaign name and status badge.
- Provider badge.
- Language default.
- Start, pause, retry eligible, export actions.
- Last event timestamp.

### Metric Band
Use dense, equal-width cells:
- Total contacts
- Queued
- Ringing
- Answered
- Completed
- Confirmed pickup
- Follow-up needed
- Manual review
- Invalid numbers

Each metric cell includes:
- Count
- Percentage of total where useful
- Small trend or "since last update" only if available

### Progress Visualization
Use a stacked horizontal bar for call status distribution:
- Queued
- Initiated/ringing
- Answered/completed
- Not picked/not connected
- Invalid/failed

Use a separate outcome bar for dispositions:
- Confirmed pickup
- Declined
- Follow-up needed
- Manual review
- Voicemail

### Charts and Data Visualization
Use charts only where they help an operator decide what to do next.

Recommended charts:
- Stacked horizontal bars for technical status and business disposition distribution.
- Funnel summary for uploaded contacts to valid contacts to queued calls to completed calls to confirmed pickups.
- Timeline/event feed for provider callbacks and state transitions.
- Small multiples for language distribution if language mix matters in a campaign.

Chart rules:
- Every chart needs a text summary of the main insight nearby.
- Do not rely on color alone; include labels, legends, and counts.
- Keep grid lines low contrast.
- Use tooltips on desktop and tap-to-expand details on mobile.
- Provide table equivalents for chart data where precision matters.

### Live Activity
Right-side panel on desktop, below metrics on mobile:
- Recent call events
- Provider callback received
- Status changed
- Recording attached
- Classification completed
- Retry queued

Each event row includes timestamp, call/contact, event type, and source.

## 5. Calls and Results Table

### Purpose
Support operational triage and export preparation.

### Filters
- Status
- Disposition
- Language
- Provider
- Retry eligible
- Has transcript
- Has recording
- Search by provider name, phone, order ID, or location

### Table Columns
- Contact/provider name
- Phone
- Location
- Machine count
- Order ID
- Attempt
- Technical status
- Business disposition
- Detected language
- Summary
- Next action
- Updated
- Actions

### Row Behavior
- Click opens call detail page or side drawer.
- Status badges use distinct colors and labels.
- Manual-review rows should be visually prominent without alarming color overuse.
- Rows with sensitive transcript snippets should truncate and require click-through for full content.

### Bulk Actions
- Export filtered rows
- Retry eligible calls
- Mark selected as manual review
- Download contact errors from import

Bulk retry must show a confirmation modal with counts by retry reason.

## 6. Call Detail

### Purpose
Let an admin inspect one call thoroughly and decide the next operational action.

### Layout
Desktop:
- Left main column: summary, transcript, recording.
- Right rail: contact metadata, status timeline, next action, retry controls.

Mobile:
- Stacked sections with sticky top summary and action menu.

### Sections

#### Outcome Summary
- Disposition badge
- Next action
- Confidence
- Summary text
- Reason code if declined or unclear
- Transcript source: simulated, provider, manual fixture, future STT

#### Contact Snapshot
- Provider name
- Phone and alternate phone
- Location and address
- Machine count
- Order ID
- Language hint and detected language

#### Recording
- Audio player when recording URL exists.
- Placeholder state when simulated or recording unavailable.
- Provider metadata and duration.

#### Transcript
- Full transcript text.
- Language label.
- Speaker labels if available.
- Highlight detected confirmation, refusal, or uncertainty phrase when classification provides evidence.

#### Timeline
Append-only event list:
- Queued
- Initiated
- Ringing
- Answered
- Completed or terminal state
- Recording attached
- Classified
- Retried

Each timeline item includes source: system, provider webhook, cron, admin, simulated.

#### Raw Provider Evidence
Hidden behind a "View audit payload" disclosure available only to admins. Keep it collapsed by default.

### Actions
- Retry call if eligible.
- Export this row.
- Mark manual review.
- Copy order ID.
- Copy recording URL.

## 7. Export UX

### Purpose
Create operations-ready CSVs without leaking unnecessary data.

### Export Types
- Confirmed pickup rows
- Follow-up needed rows
- Invalid number rows
- Manual review rows
- Full campaign summary

### Export Builder
Controls:
- Disposition filter
- Status filter
- Include alternate phone
- Include summary
- Include recording URL
- Exclude raw provider payloads by default and do not offer them in normal exports

Preview:
- First 10 rows
- Column list
- Total rows

Primary action:
- Generate CSV

Post-export:
- Download CSV
- Show export timestamp
- Show export audit entry

## 8. Settings

### Purpose
Make provider and demo readiness visible.

### Sections
- App environment: development, preview, production.
- Provider configuration:
  - Plivo status
  - Twilio scaffold status
  - Exotel scaffold status
- Webhook URLs with copy buttons.
- Cron secret status without revealing the secret.
- Language packs list.
- Demo mode configuration.

### Sensitive Values
Never display full secrets. Use masked values and status checks:
- Configured
- Missing
- Disabled in production

## Status and Badge System

### Technical Call Status
| Status | Label | Color Intent | User Meaning |
|---|---|---|---|
| `queued` | Queued | Neutral | Waiting to be called |
| `initiated` | Initiated | Info | Provider accepted call request |
| `ringing` | Ringing | Info | Recipient phone is ringing |
| `answered` | Answered | Info | Call connected |
| `completed` | Completed | Success-neutral | Call ended and evidence may exist |
| `failed` | Failed | Danger | Technical failure |
| `not_picked` | Not picked | Warning | Recipient did not answer |
| `not_connected` | Not connected | Warning | Network or provider connection issue |
| `invalid_number` | Invalid number | Danger | Number cannot be called |
| `voicemail` | Voicemail | Neutral | Reached voicemail |

### Business Disposition
| Disposition | Label | Color Intent | Default Next Action |
|---|---|---|---|
| `confirmed_pickup` | Confirmed pickup | Success | Send engineer |
| `declined` | Declined | Warning | Manual follow-up |
| `follow_up_needed` | Follow-up needed | Warning | Manual follow-up |
| `manual_review` | Manual review | Danger-muted | Verify data |
| `not_picked` | Not picked | Warning | Retry if eligible |
| `not_connected` | Not connected | Warning | Retry if eligible |
| `invalid_number` | Invalid number | Danger | Verify data |
| `voicemail` | Voicemail | Neutral | Retry or follow up |

## Language UX

### Language Picker
Show full language name and code:
- English `en`
- Hindi `hi`
- Bengali `bn`
- Punjabi `pa`
- Gujarati `gu`
- Marathi `mr`
- Tamil `ta`
- Telugu `te`
- Malayalam `ml`
- Kannada `kn`
- Odia `or`
- Assamese `as`

### Language Support Labels
- Full live: English, Hindi
- Scripted + classify: other Indian language packs

### Language Mismatch
If detected language differs from hint:
- Show both values.
- Add timeline event: "Language mismatch detected."
- In call detail, explain which script was used and which language was detected.

## Component Inventory

### Layout Components
- `AppShell`
- `SidebarNav`
- `MobileNav`
- `PageHeader`
- `CampaignSubnav`
- `ActionBar`

### Data Components
- `MetricBand`
- `StatusDistributionBar`
- `DispositionDistributionBar`
- `LiveEventFeed`
- `CampaignTable`
- `CallResultsTable`
- `ImportPreviewTable`
- `InvalidRowsDrawer`
- `AuditTimeline`

### Form Components
- `FileDropzone`
- `ColumnValidationSummary`
- `ProviderSelector`
- `LanguageSelector`
- `RetryLimitStepper`
- `CallingWindowPicker`
- `DemoModeToggle`

### Feedback Components
- `StatusBadge`
- `DispositionBadge`
- `ProviderReadinessBadge`
- `EmptyState`
- `InlineError`
- `SkeletonRows`
- `ConfirmBulkActionModal`
- `Toast`

### Sensitive Data Components
- `MaskedSecretStatus`
- `RecordingPlayer`
- `TranscriptViewer`
- `RawPayloadDisclosure`
- `ExportPreview`

## Interaction Details

### Buttons
- Use icon buttons for common utility actions: copy, retry, download, filter, refresh, close.
- Use icon plus text for primary operational commands.
- Disable destructive or irreversible actions while requests are pending.
- Each screen should have one visually dominant primary action.
- Button loading feedback must appear within 300ms.
- Tap or click feedback must appear within 100ms.
- Disabled buttons must use real disabled semantics and a clear visual state.

### Tables
- Sticky header on desktop.
- Column visibility controls after MVP if table grows.
- Preserve filters in URL query params, not local storage.
- Use server pagination for large campaigns.
- Virtualize or paginate any result set above 50 rows.
- Keep row height stable when badges, summaries, or loading states change.
- Full row click targets should not conflict with inline buttons.
- Use wrapping before truncation for important operational text; when truncation is necessary, provide tooltip or expand behavior.

### Drawers and Modals
- Use drawers for import errors and call quick view.
- Use modals for confirmation-only flows: start campaign, bulk retry, export generation.
- Keep raw payloads in collapsible disclosure, not modal-first UX.

### Toasts
Use toasts for transient completion:
- Campaign saved
- Calls queued
- Retry queued
- Export ready

Use inline errors for form validation and failed API requests.

### Motion
- Motion must communicate state change, not decorate the app.
- Use 150ms to 300ms for micro-interactions.
- Use transform and opacity for animation; avoid animating width, height, top, or left.
- Respect `prefers-reduced-motion`.
- Recommended motion moments:
  - Filter sheet opens from the control that triggered it.
  - Table skeleton crossfades into rows.
  - Live event feed prepends new events with a subtle highlight fade.
  - Confirmation modals scale and fade from the triggering action.

### Forms
- Labels must always be visible; do not use placeholder-only labels.
- Validate fields on blur or submit, not on every keystroke.
- Put errors below the relevant field and include how to fix them.
- When a submit fails, focus the first invalid field.
- Long campaign forms should preserve unsaved values during step navigation.
- Warn before dismissing a form drawer or modal with unsaved changes.

## Responsive Behavior

### Desktop
- Sidebar navigation.
- Two-column dashboard with live activity rail.
- Full data tables.
- Call detail with metadata side rail.

### Tablet
- Collapsible sidebar.
- Tables retain key columns and hide less important columns behind row expansion.
- Metric band wraps to two rows.

### Mobile
- Bottom navigation.
- Campaign cards instead of wide campaign table.
- Results table becomes list rows with key fields:
  - Name
  - Status
  - Disposition
  - Location
  - Next action
- Filters open in full-screen sheet.
- Call detail sections stack.

## Accessibility
- All controls must be keyboard reachable.
- Use visible focus rings.
- Color cannot be the only indicator for status.
- Badges include text labels.
- Audio player must have accessible labels and fallback links.
- Tables must use semantic headers.
- Form errors must connect to fields through accessible descriptions.
- Maintain at least WCAG AA contrast for text and controls.
- Provide a skip link to main content.
- Keep heading hierarchy sequential.
- Icon-only buttons need accessible names.
- Use `aria-live="polite"` for non-critical toasts and live event updates.
- Respect browser zoom and never disable viewport zoom.
- Test at 375px width, tablet width, and desktop width.
- Test reduced motion and large text settings before demo.

## Loading, Empty, and Error States

### Loading
- Skeleton rows for tables.
- Inline loading for actions.
- Preserve layout dimensions to avoid shift.
- Reserve dimensions for charts, metric bands, audio players, and tables before data loads.
- Use progressive loading for dashboard sections so the campaign header appears before secondary panels.

### Empty
- No campaigns: create campaign prompt.
- No imported contacts: upload prompt.
- No results: explain that calls have not completed yet.
- No recordings: show provider or demo reason.

### Error
- Upload error: show field-level and file-level reason.
- Provider error: show provider name and safe error summary.
- Webhook error: visible in audit timeline where appropriate.
- Classification error: mark manual review and preserve transcript evidence.
- Network timeout: show retry action and keep the user's current filters or form input.
- Empty chart state: show a text explanation and the next useful action.

## Security and Privacy UX
- Never show full API keys, shared secrets, or tokens.
- Phone numbers may be fully visible to admins, but should be copy-controlled and not exposed before sign-in.
- Raw provider payloads are hidden by default.
- Recording and transcript pages require admin access.
- Export preview should make included columns explicit.
- Demo mode should be visibly labeled to avoid confusing simulated and live evidence.

## Demo Golden Path UX

The demo should be possible in under 5 minutes:
1. Open Campaigns.
2. Create campaign.
3. Upload sample Excel with 10 contacts.
4. Review import summary.
5. Select Plivo or Simulated provider.
6. Start campaign.
7. Run simulated callbacks.
8. Watch dashboard metrics update.
9. Open one completed call.
10. Show transcript, summary, detected language, disposition, next action, and recording placeholder or URL.
11. Export confirmed pickup CSV.

### Demo Data Targets
Dashboard should visibly show:
- At least 3 confirmed pickups.
- At least 2 follow-up needed.
- At least 1 invalid number.
- At least 1 not picked.
- At least 1 manual review or declined row if available.

## Content Guidelines

### Voice
Use direct operational language:
- "Start campaign"
- "Retry eligible calls"
- "Export confirmed pickups"
- "Manual review required"
- "Provider credentials missing"

Avoid vague AI wording:
- Do not say "AI thinks."
- Prefer "Classification result" or "Detected from transcript."

### Confirmation Copy
Start campaign:
"This will queue calls for 10 valid contacts. Calls may begin immediately through Plivo. Continue?"

Start simulated campaign:
"This will queue demo calls and use simulated callbacks. No live calls will be placed."

Bulk retry:
"Retry 14 eligible calls? Completed, confirmed, declined, invalid, and manual-review calls will not be retried."

Export:
"Generate CSV for 3 confirmed pickups. Raw provider payloads and secrets are excluded."

## Implementation Notes for Next.js and Tailwind
- Keep shared UI components in `src/components`.
- Keep route-specific views near their App Router pages.
- Keep domain labels and status metadata in `src/domain` so UI and export logic stay aligned.
- Use URL query params for campaign result filters.
- Use server-side data fetching for dashboard summaries when possible.
- Avoid reading `process.env` in UI components.
- Use optimistic UI only for low-risk actions like filter changes, not campaign start or retry.
- Define semantic Tailwind tokens for color, radius, shadow, spacing, z-index, and typography.
- Use one icon family, preferably Lucide, with consistent stroke width.
- Use native form controls where possible and style them through tokens.
- Split heavy dashboard tables or charts by route or dynamic import if bundle size grows.
- Keep raw status color values in one status metadata file, not scattered across components.
- Avoid decorative background effects that add paint cost or reduce contrast.

## UI-UX-Pro-Max Quality Gate

Before implementing or shipping a UI slice, check:
- Accessibility: contrast, focus, labels, keyboard order, screen reader names, skip link.
- Touch and interaction: 44px minimum targets, visible press states, no hover-only controls.
- Performance: stable dimensions, route splitting, virtualized or paginated lists, no layout shift.
- Style consistency: semantic tokens, one icon family, no emoji as structural icons.
- Responsive layout: 375px, 768px, 1024px, and 1440px checks with no horizontal scroll.
- Forms: visible labels, field-level errors, recovery paths, unsaved-change protection.
- Motion: meaningful, interruptible, reduced-motion-safe transitions.
- Charts: legends, labels, accessible summaries, table fallback for precision.

## Design Acceptance Criteria
- Upload to campaign creation can be completed in under 2 minutes.
- Campaign start clearly distinguishes live provider mode from simulated mode.
- Dashboard shows technical status and business disposition separately.
- Call detail exposes transcript, summary, recording, next action, language, and audit timeline.
- Export flow excludes raw provider payloads and secrets.
- Mobile layout supports campaign monitoring and call triage.
- Empty, loading, error, and permission states are designed for every primary screen.
- Sensitive data is hidden until authenticated and never displayed in settings as raw secrets.
