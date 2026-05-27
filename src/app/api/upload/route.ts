import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createCampaignFromContacts } from "@/services/campaigns/engine";
import { saveCampaign } from "@/services/campaigns/file-store";
import { parseContactFile } from "@/services/ingestion/parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const defaultLanguage = String(form.get("default_language") ?? env.primaryCallLanguage);
    const campaignName = String(form.get("campaign_name") ?? "Uploaded campaign");
    const companyName = String(form.get("company_name") ?? "Demo Logistics");
    const concurrencyLimit = Number(form.get("concurrency_limit") ?? 5);
    const content = Buffer.from(await file.arrayBuffer());
    const parsed = await parseContactFile({ fileName: file.name, content, defaultLanguage });
    const campaign = createCampaignFromContacts({
      name: campaignName,
      companyName,
      defaultLanguage,
      concurrencyLimit,
      contacts: parsed.validRows,
      provider: "simulated"
    });

    await saveCampaign(campaign);

    return NextResponse.json({
      campaign,
      import_summary: {
        imported: parsed.validRows.length,
        invalid: parsed.invalidRows.length,
        duplicates: parsed.duplicateRows.length,
        source_columns: parsed.sourceColumns,
        invalid_rows: parsed.invalidRows,
        duplicate_rows: parsed.duplicateRows
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
