import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth";
import { getCampaign } from "@/services/campaigns/file-store";
import { buildResultsCsv, buildResultsHtmlTable } from "@/services/export/csv";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuthenticated();
  if (authError) return authError;

  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "html") {
    return NextResponse.json({ error: "Unsupported export format. Use format=csv or format=html." }, { status: 400 });
  }

  const campaign = await getCampaign(id);
  if (!campaign) return new Response("Campaign not found", { status: 404 });

  const baseName = campaign.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  if (format === "html") {
    return new Response(buildResultsHtmlTable(campaign), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}-results.html"`
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
