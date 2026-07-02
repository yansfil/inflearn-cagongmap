import { listSubmissions, listEditRequests } from "../../../lib/adminReports";
import { ReportsView } from "../../../components/admin/ReportsView";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const [submissions, editRequests] = await Promise.all([
    listSubmissions(),
    listEditRequests(),
  ]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">제보 관리</h1>
        <p className="text-sm text-muted-foreground">
          새 장소 제보와 기존 장소 수정 요청을 확인합니다.
        </p>
      </div>
      <ReportsView submissions={submissions} editRequests={editRequests} />
    </div>
  );
}
