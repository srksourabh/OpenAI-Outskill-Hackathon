import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildPromptStudioPreview } from "@/domain/voice-agent";
import { jsonError } from "@/lib/http";
import { getCampaign, updateCampaign } from "@/services/campaigns/file-store";
import { mergeCampaignAgentSettings } from "@/services/campaigns/engine";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const current = await getCampaign(id);
    if (!current) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const campaign = await updateCampaign(id, (existing) =>
      mergeCampaignAgentSettings(existing, {
        default_language: typeof body.default_language === "string" ? body.default_language : existing.default_language,
        voice_preset: typeof body.voice_preset === "string" ? body.voice_preset : existing.agent_settings.voice_preset,
        voice_id: typeof body.voice_id === "string" ? body.voice_id : existing.agent_settings.voice_id,
        tone: typeof body.tone === "string" ? body.tone : existing.agent_settings.tone,
        prompt_enhancement: typeof body.prompt_enhancement === "string" ? body.prompt_enhancement : existing.agent_settings.prompt_enhancement,
        self_improve_enabled: Boolean(body.self_improve_enabled)
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
