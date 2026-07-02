import { PlaceForm } from "../../../../components/admin/PlaceForm";
import { createPlaceAction } from "../../actions";
import { getSubmission } from "../../../../lib/adminReports";
import type { PlaceRow } from "../../../../lib/types";

export const dynamic = "force-dynamic";

/**
 * 장소 추가.
 *
 * 제보 승인에서 넘어오면 ?submission=<id> 로 진입한다. 그 제보의 URL/메모/사진을
 * 폼에 프리필하고, 저장 성공 시(createPlaceAction) 제보를 approved 로 바꾼다.
 */
export default async function NewPlacePage({
  searchParams,
}: {
  searchParams: { submission?: string };
}) {
  const submissionId = searchParams.submission ?? null;

  let initial: Partial<PlaceRow> | null = null;
  let initialPhotos: string[] = [];

  if (submissionId) {
    const sub = await getSubmission(submissionId);
    if (sub) {
      initial = { naver_place_url: sub.naver_place_url };
      // 메모는 참고용으로 태그 대신 주소 힌트로 두기보다 tags 프리필은 비우고,
      // 사진은 후보로 채운다.
      initialPhotos = sub.photos ?? [];
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">장소 추가</h1>
        {submissionId ? (
          <p className="text-sm text-muted-foreground">
            제보 승인 - 저장하면 제보가 승인 처리됩니다.
          </p>
        ) : null}
      </div>
      {submissionId && initial === null ? (
        <p className="text-sm text-destructive">
          제보를 찾을 수 없습니다. 빈 폼으로 진행합니다.
        </p>
      ) : null}
      <PlaceForm
        mode="create"
        action={createPlaceAction}
        initial={initial}
        submissionId={submissionId}
        initialPhotos={initialPhotos}
      />
    </div>
  );
}
