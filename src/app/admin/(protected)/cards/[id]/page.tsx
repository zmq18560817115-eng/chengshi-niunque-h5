import { redirect } from "next/navigation";
import { requireCurrentAdmin } from "@/server/auth/request-session";

export default async function LegacyAdminPage() {
  await requireCurrentAdmin();
  redirect("/admin#report-images");
}
