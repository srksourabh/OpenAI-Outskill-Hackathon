import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/session";
import { formatDateTime } from "@/lib/date-time";
import { listCampaigns } from "@/services/campaigns/file-store";

export const runtime = "nodejs";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const role = await getSessionRole();
  if (!role) redirect("/login");

  const { id } = await params;
  const campaigns = await listCampaigns();
  const campaign = campaigns.find((item) => item.calls.some((call) => call.id === id));
  const call = campaign?.calls.find((item) => item.id === id);
  const contact = call ? campaign?.contacts.find((item) => item.id === call.contact_id) : null;

  if (!campaign || !call || !contact) {
    return (
      <main className="min-h-dvh bg-surface p-6 text-ink">
        <Link className="text-sm font-black text-accent" href="/campaigns/results">Back to results</Link>
        <section className="mt-6 rounded-[28px] bg-panel p-6 text-ink shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]">
          <h1 className="text-xl font-black">Call not found</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-surface p-6 text-ink">
      <Link className="text-sm font-black text-accent" href="/campaigns/results">Back to results</Link>
      <section className="mt-6 rounded-[32px] bg-panel p-6 text-ink shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted">MVP call detail</p>
            <h1 className="mt-1 text-4xl font-black text-accent">{contact.provider_name}</h1>
            <p className="mt-1 font-mono text-sm text-muted">{contact.phone}</p>
          </div>
          <span className={`rounded-md px-3 py-2 text-sm font-black ${call.status === "completed" ? "bg-success text-white" : "bg-accent text-ink"}`}>{call.status}</span>
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
          <Info label="Receiver attitude" value={call.receiver_attitude ?? "unknown"} />
          <Info label="Attitude confidence" value={String(call.receiver_attitude_confidence ?? 0)} />
          <Info label="Callback requested at" value={formatDateTime(call.callback_requested_at)} />
          <Info label="Callback remarks" value={call.callback_remarks || "-"} />
          <Info label="Missed call note" value={call.missed_call_note || "-"} />
          <Info label="Attempt" value={String(call.attempt_number)} />
        </div>
        <div className="mt-5 rounded-[24px] bg-panel p-4 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]">
          <h2 className="text-sm font-black">Behavior Verification</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-4">
            <Info label="Language QA" value={call.qa_language_status ?? "warn"} />
            <Info label="Tone QA" value={call.qa_tone_status ?? "warn"} />
            <Info label="QA score" value={String(call.qa_score ?? 0)} />
            <Info label="QA notes" value={call.qa_notes ?? "No QA notes yet."} />
          </div>
        </div>
        <Evidence title="Summary" value={call.summary_text || "No summary yet."} />
        <Evidence title="Transcript" value={call.transcript_text || "Transcript pending."} />
        {call.transcript_text ? (
          <a
            className="mt-4 inline-flex rounded-2xl bg-accent px-4 py-2 text-sm font-black text-white shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]"
            download={`transcript-${call.id}.txt`}
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(call.transcript_text)}`}
          >
            Download transcript
          </a>
        ) : null}
        <Evidence title="Recording" value={call.recording_url || "Recording pending."} />
        <div className="mt-5 rounded-[24px] bg-panel p-4 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]">
          <h2 className="text-sm font-black">Status history</h2>
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
    <div className="mt-5 rounded-[24px] bg-panel p-4 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]">
      <h2 className="text-sm font-black">{title}</h2>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{value}</pre>
    </div>
  );
}
