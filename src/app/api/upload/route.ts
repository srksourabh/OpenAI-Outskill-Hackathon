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
    const companyName = String(form.get("company_name") ?? "UDS");
    const promptConfig = {
      asset_label: String(form.get("asset_label") ?? "POS machine"),
      reference_label: String(form.get("reference_label") ?? "POS machine number"),
      account_label: String(form.get("account_label") ?? "company/bank"),
      account_name: String(form.get("account_name") ?? "")
    };
    const agentSettings = {
      voice_preset: String(form.get("voice_preset") ?? "indian_female_natural"),
      voice_id: String(form.get("voice_id") ?? ""),
      tone: String(form.get("tone") ?? "warm"),
      prompt_enhancement: String(form.get("prompt_enhancement") ?? ""),
      self_improve_enabled: String(form.get("self_improve_enabled") ?? "") === "true"
    };
    const requestedProvider = String(form.get("provider") ?? env.telephonyProvider ?? "simulated");
    const concurrencyLimit = Number(form.get("concurrency_limit") ?? 5);
    const content = Buffer.from(await file.arrayBuffer());
    const parsed = await parseContactFile({ fileName: file.name, content, defaultLanguage });
    const campaign = createCampaignFromContacts({
      name: campaignName,
      companyName,
      defaultLanguage,
      concurrencyLimit,
      contacts: parsed.validRows,
      provider: requestedProvider === "plivo" ? "plivo" : "simulated",
      promptConfig,
      agentSettings
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
