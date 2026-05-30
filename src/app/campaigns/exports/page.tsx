import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/session";

export default async function ExportsCampaignPage() {
  const role = await getSessionRole();
  if (!role) {
    redirect("/login");
  }
  redirect("/campaigns/results");
}
