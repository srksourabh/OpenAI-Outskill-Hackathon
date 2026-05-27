import { getCampaign } from "@/services/campaigns/file-store";
import { buildResultsCsv } from "@/services/export/csv";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return new Response("Campaign not found", { status: 404 });
  return new Response(buildResultsCsv(campaign), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${campaign.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-results.csv"`
    }
  });
}
