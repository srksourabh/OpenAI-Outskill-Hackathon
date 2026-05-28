import { NextResponse } from "next/server";
import { requireCron } from "@/lib/auth";
import { isRetryEligible } from "@/domain/calls";
import { listCampaigns, saveCampaign } from "@/services/campaigns/file-store";
import { retryCallInCampaign } from "@/services/campaigns/retry";

export async function GET(request: Request) {
  const authError = requireCron(request);
  if (authError) return authError;

  let retried = 0;
  const campaigns = await listCampaigns();
  for (const campaign of campaigns) {
    let next = campaign;
    for (const call of campaign.calls) {
      if (!isRetryEligible(call.status, call.disposition) || call.attempt_number >= campaign.retry_limit) continue;
      next = retryCallInCampaign(next, call.id);
      retried += 1;
    }
    if (next !== campaign) await saveCampaign(next);
  }

  return NextResponse.json({ ok: true, retried });
}
