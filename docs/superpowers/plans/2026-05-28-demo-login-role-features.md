# Demo Login Role Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show detailed hackathon reviewer-facing Admin and User role capabilities on the public login page.

**Architecture:** Keep role copy in the shared demo-account module so the login UI and tests use one source of truth. Render concise feature lists inside each login card without changing the authentication flow.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest.

---

## File Structure

- Modify: `src/lib/demo-accounts.ts`
  - Add a `features` array and `bestFor` string to each demo account.
  - Keep the existing email/password/role values unchanged.
- Modify: `src/app/login/page.tsx`
  - Render role capabilities under each credential block.
  - Keep the click-to-fill behavior unchanged.
- Modify: `tests/unit/demo-login.test.ts`
  - Assert both demo accounts publish role-specific feature details.
  - Keep production auth acceptance tests unchanged.
- Modify: `TASKS.md`
  - Mark the login role-feature detail as completed.

## Task 1: Extend Demo Account Metadata

**Files:**
- Modify: `src/lib/demo-accounts.ts`
- Test: `tests/unit/demo-login.test.ts`

- [ ] **Step 1: Write the failing test**

Add expectations to `tests/unit/demo-login.test.ts`:

```ts
expect(DEMO_LOGIN_ACCOUNTS).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      email: "admin@edial.ai",
      features: expect.arrayContaining(["Create campaigns from single numbers, number lists, CSV, or Excel uploads."])
    }),
    expect.objectContaining({
      email: "user@edial.ai",
      features: expect.arrayContaining(["Review campaign dashboards, call outcomes, transcripts, summaries, and next actions."])
    })
  ])
);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/demo-login.test.ts
```

Expected: FAIL because `features` is not defined yet.

- [ ] **Step 3: Add role metadata**

Update `src/lib/demo-accounts.ts`:

```ts
export type DemoLoginAccount = {
  email: string;
  password: string;
  role: "admin" | "user";
  label: string;
  helpText: string;
  bestFor: string;
  features: string[];
};
```

Admin feature list:

```ts
features: [
  "Create campaigns from single numbers, number lists, CSV, or Excel uploads.",
  "Configure provider, language, retry, concurrency, voice, tone, and prompt settings.",
  "Start campaigns, run simulated callbacks, retry eligible calls, and manage campaign actions.",
  "Review full call history, transcripts, summaries, recordings, QA notes, and receiver attitude.",
  "Export all results, engineer-ready pickups, and follow-up rows for operations handoff."
]
```

User feature list:

```ts
features: [
  "Review campaign dashboards, call outcomes, transcripts, summaries, and next actions.",
  "Inspect uploaded contact details beside call status, disposition, language, and attempt count.",
  "Open call detail pages to audit recording links, status history, callback notes, and QA signals.",
  "Use filters and result views for demo review without changing campaign data.",
  "Validate the read-only stakeholder experience for founders, judges, and operations reviewers."
]
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/demo-login.test.ts
```

Expected: PASS.

## Task 2: Render Feature Lists on Login Page

**Files:**
- Modify: `src/app/login/page.tsx`
- Test: covered by TypeScript and production build

- [ ] **Step 1: Render `bestFor` and `features`**

Inside each account card, after the credential block, render:

```tsx
<span className="mt-3 block text-xs font-semibold text-ink">Best for: {account.bestFor}</span>
<ul className="mt-3 space-y-2 text-xs leading-5 text-muted">
  {account.features.map((feature) => (
    <li className="flex gap-2" key={feature}>
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <span>{feature}</span>
    </li>
  ))}
</ul>
```

- [ ] **Step 2: Verify type checking**

Run:

```powershell
npm run lint
```

Expected: PASS.

## Task 3: Update Tracking and Verify

**Files:**
- Modify: `TASKS.md`

- [ ] **Step 1: Update the task checklist**

Add this completed item near the existing login-page work:

```md
- [x] Add detailed Admin and User role feature descriptions to the public hackathon login page.
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
.\scripts\verify.ps1
```

Expected: TypeScript, Vitest, and Next.js production build all pass.

- [ ] **Step 3: Deploy production**

Run:

```powershell
npx -y vercel@latest deploy --prod --yes --project outbound-ai-calling-agent
```

Expected: Vercel reports the deployment ready and aliases `https://outbound-ai-calling-agent.vercel.app`.

- [ ] **Step 4: Smoke-test production login page**

Run:

```powershell
(Invoke-WebRequest -UseBasicParsing https://outbound-ai-calling-agent.vercel.app/login).Content
```

Expected: Response HTML contains `Test Admin`, `Test User`, `Create campaigns`, and `Review campaign dashboards`.

## Self-Review

- Spec coverage: Covers the requested detailed Admin/User role feature copy on the login page.
- Placeholder scan: No placeholders, TBDs, or deferred implementation steps.
- Type consistency: `features` and `bestFor` are added to the shared type before UI usage.
