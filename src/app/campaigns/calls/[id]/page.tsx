import Link from "next/link";
import { listCampaigns } from "@/services/campaigns/file-store";

export const runtime = "nodejs";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaigns = await listCampaigns();
  const campaign = campaigns.find((item) => item.calls.some((call) => call.id === id));
  const call = campaign?.calls.find((item) => item.id === id);
  const contact = call ? campaign?.contacts.find((item) => item.id === call.contact_id) : null;

  if (!campaign || !call || !contact) {
    return (
      <main className="min-h-dvh bg-surface p-6 text-ink">
        <Link className="text-sm font-medium text-accent" href="/campaigns">Back to campaigns</Link>
        <section className="mt-6 rounded-lg border border-line bg-panel p-6">
          <h1 className="text-xl font-semibold">Call not found</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-surface p-6 text-ink">
      <Link className="text-sm font-medium text-accent" href="/campaigns">Back to campaigns</Link>
      <section className="mt-6 rounded-lg border border-line bg-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{contact.provider_name}</h1>
            <p className="mt-1 font-mono text-sm text-muted">{contact.phone}</p>
          </div>
          <span className="rounded bg-surface px-3 py-1 text-sm">{call.status}</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Info label="Campaign" value={campaign.name} />
          <Info label="Location" value={contact.location} />
          <Info label="Order" value={contact.order_id} />
          <Info label="Disposition" value={call.disposition} />
          <Info label="Next action" value={call.next_action} />
          <Info label="Detected language" value={call.detected_language} />
          <Info label="Transcript status" value={call.transcript_status} />
          <Info label="Confidence" value={String(call.confidence)} />
          <Info label="Attempt" value={String(call.attempt_number)} />
        </div>
        <Evidence title="Summary" value={call.summary_text || "No summary yet."} />
        <Evidence title="Transcript" value={call.transcript_text || "Transcript pending."} />
        <Evidence title="Recording" value={call.recording_url || "Recording pending."} />
        <div className="mt-5 rounded-md border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Status history</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {call.status_history.map((item, index) => (
              <li key={`${item.status}-${item.at}-${index}`}>
                <span className="font-medium">{item.status}</span> <span className="text-muted">{item.at}</span> {item.note}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 break-words">{value}</div>
    </div>
  );
}

function Evidence({ title, value }: { title: string; value: string }) {
  return (
    <div className="mt-5 rounded-md border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{value}</pre>
    </div>
  );
}
