import { LatestBatchForm } from "@/components/admin/LatestBatchForm";
import { ReportImagesManager } from "@/components/admin/ReportImagesManager";
import { LatestBatchService } from "@/server/services/latest-batch-service";
import { AdminReportImagesService } from "@/server/services/admin-report-images-service";
import { requireCurrentAdmin } from "@/server/auth/request-session";

export default async function AdminPage() {
  await requireCurrentAdmin();
  const [batch, cards] = await Promise.all([new LatestBatchService().get(), new AdminReportImagesService().list()]);
  return <main>
    <div className="admin-page-heading">
      <div><h1>批次与报告图片管理</h1><p>在此更新首页公开批次和对应项目的报告图片。</p></div>
    </div>
    <div id="latest-batch"><LatestBatchForm initialValue={batch}/></div>
    <ReportImagesManager cards={cards}/>
  </main>;
}
