import { getCampaign } from "@/services/campaigns/file-store";
import { buildResultsCsv, buildResultsExcelTable } from "@/services/export/csv";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const campaign = await getCampaign(id);
  if (!campaign) return new Response("Campaign not found", { status: 404 });

  const baseName = campaign.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  if (format === "xlsx") {
    return new Response(buildResultsExcelTable(campaign), {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}-results.xls"`
      }
    });
  }

  return new Response(buildResultsCsv(campaign), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}-results.csv"`
    }
  });
}
