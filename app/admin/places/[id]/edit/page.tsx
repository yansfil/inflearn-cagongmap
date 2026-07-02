import { notFound } from "next/navigation";
import { PlaceForm } from "../../../../../components/admin/PlaceForm";
import { updatePlaceAction } from "../../../actions";
import { getPlace } from "../../../../../lib/adminData";
import { getEditRequest } from "../../../../../lib/adminReports";

export const dynamic = "force-dynamic";

/**
 * 장소 수정.
 *
 * 수정 요청 승인에서 넘어오면 ?edit_request=<id> 로 진입한다. 기존 장소 값 위에
 * 그 요청의 사진을 후보로 얹고, 저장 성공 시 요청을 approved 로 바꾼다.
 */
export default async function EditPlacePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { edit_request?: string };
}) {
  const place = await getPlace(params.id);
  if (!place) notFound();

  const editRequestId = searchParams.edit_request ?? null;
  let initialPhotos = place.photos ?? [];
  let requestMemo: string | null = null;

  if (editRequestId) {
    const req = await getEditRequest(editRequestId);
    if (req) {
      // 기존 사진 + 요청 사진(후보)을 합친다(중복 제거).
      initialPhotos = Array.from(
        new Set([...(place.photos ?? []), ...(req.photos ?? [])])
      );
      requestMemo = req.memo;
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">장소 수정 - {place.name}</h1>
        {editRequestId ? (
          <p className="text-sm text-muted-foreground">
            수정 요청 반영 - 저장하면 요청이 승인 처리됩니다.
          </p>
        ) : null}
        {requestMemo ? (
          <p className="mt-2 rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">요청 메모:</span> {requestMemo}
          </p>
        ) : null}
      </div>
      <PlaceForm
        mode="edit"
        action={updatePlaceAction}
        initial={place}
        editRequestId={editRequestId}
        initialPhotos={initialPhotos}
      />
    </div>
  );
}
