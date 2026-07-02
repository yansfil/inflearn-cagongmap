"use client";

import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { uploadAdminPhotosAction } from "../../app/admin/actions";

/**
 * 장소 사진 관리 UI.
 *
 * photos(URL 배열)를 부모(PlaceForm)가 소유하고, 여기서 추가/교체/삭제를 조작한다.
 * 업로드는 Server Action(uploadAdminPhotosAction, service_role) 을 통해서만
 * 이뤄진다(클라이언트가 스토리지에 직접 쓰지 않음). 반환된 public URL 을 배열에
 * 반영한다. 삭제는 배열에서 제거하고 서버가 저장 시 정리한다.
 */
export interface PhotoManagerProps {
  photos: string[];
  onChange: (next: string[]) => void;
  /** 업로드 진행 상태를 부모(PlaceForm)에 알려 저장 버튼을 잠그게 한다. */
  onBusyChange?: (busy: boolean) => void;
}

export function PhotoManager({
  photos,
  onChange,
  onBusyChange,
}: PhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  function updateBusy(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    updateBusy(true);
    setError(null);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      const result = await uploadAdminPhotosAction(form);
      if (!result.ok || !result.urls || result.urls.length === 0) {
        setError(result.error ?? "업로드에 실패했습니다.");
        return;
      }
      if (replaceIndex !== null) {
        // 교체: 해당 인덱스를 첫 업로드 URL 로 대체
        const next = [...photos];
        next[replaceIndex] = result.urls[0];
        onChange(next);
        setReplaceIndex(null);
      } else {
        onChange([...photos, ...result.urls]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      updateBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {photos.map((url, i) => (
            <div key={`${url}-${i}`} className="grid gap-1.5">
              <div className="w-28 h-28 rounded-md border border-border overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 flex-1 px-0 text-xs"
                  disabled={busy}
                  onClick={() => {
                    setReplaceIndex(i);
                    inputRef.current?.click();
                  }}
                >
                  교체
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-7 flex-1 px-0 text-xs"
                  disabled={busy}
                  onClick={() => remove(i)}
                >
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">등록된 사진이 없습니다.</p>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            setReplaceIndex(null);
            inputRef.current?.click();
          }}
        >
          {busy ? "업로드 중..." : "사진 추가"}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
