import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/session";
import { CampaignWorkspace } from "../workspace";

export default async function NewCampaignPage() {
  const role = await getSessionRole();
  if (!role) {
    redirect("/login");
  }
  return <CampaignWorkspace view="new" />;
}
