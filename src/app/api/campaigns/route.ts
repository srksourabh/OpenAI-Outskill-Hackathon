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
        call_purpose?: string;
        request_type?: string;
        asset_label?: string;
        reference_label?: string;
        address_label?: string;
        confirmation_points?: string[] | string;
        collection_points?: string[] | string;
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
          call_purpose: String(body.prompt_config.call_purpose ?? "validate merchant details and confirm service readiness"),
          request_type: String(body.prompt_config.request_type ?? "de-installation"),
          asset_label: String(body.prompt_config.asset_label ?? "POS machine"),
          reference_label: String(body.prompt_config.reference_label ?? "terminal ID"),
          address_label: String(body.prompt_config.address_label ?? "service address"),
          confirmation_points: parseChecklistValue(body.prompt_config.confirmation_points),
          collection_points: parseChecklistValue(body.prompt_config.collection_points)
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

function parseChecklistValue(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}
