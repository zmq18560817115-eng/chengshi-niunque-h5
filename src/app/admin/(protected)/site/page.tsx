import { LatestBatchForm } from "@/components/admin/LatestBatchForm";
import { LatestBatchService } from "@/server/services/latest-batch-service";
import { requireCurrentAdmin } from "@/server/auth/request-session";

export default async function SiteSettingsPage() {
  await requireCurrentAdmin();
  const value = await new LatestBatchService().get();
  return <main><div className="admin-page-heading"><div><h1>公开批次</h1><p>维护当前公开的正装批次、试用装批次和检测日期。</p></div></div><LatestBatchForm initialValue={value}/></main>;
}
