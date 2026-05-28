export type DemoLoginAccount = {
  email: string;
  password: string;
  role: "admin" | "user";
  label: string;
  helpText: string;
  bestFor: string;
  features: string[];
};

export const DEMO_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  {
    email: "admin@edial.ai",
    password: "Admin@123",
    role: "admin",
    label: "Test Admin",
    helpText: "Full demo access for creating campaigns, uploads, calls, and exports.",
    bestFor: "Judges testing the complete operator workflow.",
    features: [
      "Create campaigns from single numbers, number lists, CSV, or Excel uploads.",
      "Configure provider, language, retry, concurrency, voice, tone, and prompt settings.",
      "Start live calling campaigns, retry eligible calls, and manage campaign actions.",
      "Review full call history, transcripts, summaries, recordings, QA notes, and receiver attitude.",
      "Export all results, engineer-ready pickups, and follow-up rows for operations handoff."
    ]
  },
  {
    email: "user@edial.ai",
    password: "User@123",
    role: "user",
    label: "Test User",
    helpText: "Read-only demo access for reviewing dashboards, calls, and results.",
    bestFor: "Stakeholders reviewing outcomes without changing data.",
    features: [
      "Review campaign dashboards, call outcomes, transcripts, summaries, and next actions.",
      "Inspect uploaded contact details beside call status, disposition, language, and attempt count.",
      "Open call detail pages to audit recording links, status history, callback notes, and QA signals.",
      "Use filters and download result exports without changing campaign data.",
      "Validate the read-only stakeholder experience for founders, judges, and operations reviewers."
    ]
  }
];
