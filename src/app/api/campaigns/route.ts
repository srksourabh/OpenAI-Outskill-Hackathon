import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createCampaignFromContacts } from "@/services/campaigns/engine";
import { listCampaigns, saveCampaign } from "@/services/campaigns/file-store";
import type { ParsedContact } from "@/services/ingestion/types";

export const runtime = "nodejs";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const body = (await request.json()) as {
      name?: string;
      company_name?: string;
      default_language?: string;
      concurrency_limit?: number;
      provider?: "simulated" | "plivo";
      prompt_config?: {
        asset_label?: string;
        reference_label?: string;
        account_label?: string;
        account_name?: string;
      };
      agent_settings?: {
        voice_preset?: string;
        voice_id?: string;
        tone?: string;
        prompt_enhancement?: string;
        self_improve_enabled?: boolean;
      };
      contacts?: ParsedContact[];
    };

    const promptConfig = body.prompt_config
      ? {
          asset_label: String(body.prompt_config.asset_label ?? "POS machine"),
          reference_label: String(body.prompt_config.reference_label ?? "POS machine number"),
          account_label: String(body.prompt_config.account_label ?? "company/bank"),
          account_name: String(body.prompt_config.account_name ?? "")
        }
      : undefined;

    const campaign = createCampaignFromContacts({
      name: body.name ?? "Draft campaign",
      companyName: body.company_name ?? "UDS",
      defaultLanguage: body.default_language ?? env.primaryCallLanguage,
      concurrencyLimit: Number(body.concurrency_limit ?? 5),
      provider: body.provider === "plivo" ? "plivo" : "simulated",
      contacts: Array.isArray(body.contacts) ? body.contacts : [],
      promptConfig,
      agentSettings: body.agent_settings
    });

    await saveCampaign(campaign);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
