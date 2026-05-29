import { redirect } from "next/navigation";

export default async function SettingsCampaignPage() {
  redirect("/campaigns/new");
}
