import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildPromptStudioPreview } from "@/domain/voice-agent";
import { jsonError } from "@/lib/http";
import { getCampaign, updateCampaign } from "@/services/campaigns/file-store";
import { mergeCampaignConfiguration } from "@/services/campaigns/engine";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const current = await getCampaign(id);
    if (!current) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const campaign = await updateCampaign(id, (existing) =>
      mergeCampaignConfiguration(existing, {
        company_name: typeof body.company_name === "string" ? body.company_name : existing.company_name,
        default_language: typeof body.default_language === "string" ? body.default_language : existing.default_language,
        prompt_config: {
          call_purpose: typeof body.call_purpose === "string" ? body.call_purpose : existing.prompt_config.call_purpose,
          request_type: typeof body.request_type === "string" ? body.request_type : existing.prompt_config.request_type,
          asset_label: typeof body.asset_label === "string" ? body.asset_label : existing.prompt_config.asset_label,
          reference_label: typeof body.reference_label === "string" ? body.reference_label : existing.prompt_config.reference_label,
          address_label: typeof body.address_label === "string" ? body.address_label : existing.prompt_config.address_label,
          confirmation_points: parseChecklistValue(body.confirmation_points, existing.prompt_config.confirmation_points),
          collection_points: parseChecklistValue(body.collection_points, existing.prompt_config.collection_points)
        },
        agent_settings: {
          voice_preset: typeof body.voice_preset === "string" ? body.voice_preset : existing.agent_settings.voice_preset,
          voice_id: typeof body.voice_id === "string" ? body.voice_id : existing.agent_settings.voice_id,
          tone: typeof body.tone === "string" ? body.tone : existing.agent_settings.tone,
          prompt_enhancement: typeof body.prompt_enhancement === "string" ? body.prompt_enhancement : existing.agent_settings.prompt_enhancement,
          self_improve_enabled: Boolean(body.self_improve_enabled)
        }
      })
    );
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json({
      campaign,
      prompt_studio: {
        blended_preview: buildPromptStudioPreview({
          companyName: campaign.company_name,
          defaultLanguage: campaign.default_language,
          promptConfig: campaign.prompt_config,
          agentSettings: campaign.agent_settings,
          selfImprovementNotes: campaign.self_improvement_notes
        })
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}

function parseChecklistValue(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const normalized = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
  }

  if (typeof value === "string") {
    const normalized = value
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
  }

  return fallback;
}
