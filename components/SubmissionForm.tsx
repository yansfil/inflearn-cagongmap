"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppState } from "./AppStateProvider";
import {
  UploadError,
  removeUploadedPhotos,
  uploadPhotosWithPaths,
  validateFiles,
} from "../lib/uploads";
import ImagePicker from "./ImagePicker";

/**
 * 사용자 제보 폼(모달). 두 용도로 재사용한다.
 *   - 기존 장소 정보 수정 요청 (place_edit_requests): memo + 사진
 *   - 새 장소 제보 (place_submissions): naver_place_url(필수) + memo + 사진
 *
 * 제출: 사진을 place-images 버킷 uploads/{uid}/ 에 올리고 public URL 을 photos 에
 * 담아 대상 테이블에 status='pending' 으로 insert 한다. 비로그인은 진입 시점에서
 * 막히지만(버튼이 openLoginPrompt 호출) 방어적으로 여기서도 재확인한다.
 */

export type SubmissionKind = "edit" | "report";

interface SubmissionFormProps {
  kind: SubmissionKind;
  /** kind === "edit" 일 때만 사용: 대상 place id */
  placeId?: string;
  onClose: () => void;
}

export default function SubmissionForm({
  kind,
  placeId,
  onClose,
}: SubmissionFormProps) {
  const { supabase, user } = useAppState();
  const [naverUrl, setNaverUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isReport = kind === "report";
  const title = isReport ? "새 카페 제보" : "정보 수정 요청";
  const eyebrow = isReport ? "NEW PLACE" : "EDIT REQUEST";
  const submitLabel = isReport ? "제보 보내기" : "수정 요청 보내기";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleFilesChange(nextFiles: File[]) {
    try {
      validateFiles(nextFiles);
      setFiles(nextFiles);
      setError(null);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : "사진을 확인해 주세요.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabase || !user) {
      setError("로그인이 필요합니다.");
      return;
    }
    if (isReport && !naverUrl.trim()) {
      setError("네이버 지도 URL을 입력해 주세요.");
      return;
    }
    if (!isReport && !placeId) {
      setError("대상 장소를 찾을 수 없습니다.");
      return;
    }

    setSubmitting(true);
    let uploadedPaths: string[] = [];
    try {
      const uploaded = files.length
        ? await uploadPhotosWithPaths(supabase, user.id, files)
        : [];
      uploadedPaths = uploaded.map((photo) => photo.path);
      const photos = uploaded.map((photo) => photo.url);

      if (isReport) {
        const { error: insErr } = await supabase
          .from("place_submissions")
          .insert({
            user_id: user.id,
            naver_place_url: naverUrl.trim(),
            memo: memo.trim() || null,
            photos,
          });
        if (insErr) throw new Error(insErr.message);
      } else {
        const { error: insErr } = await supabase
          .from("place_edit_requests")
          .insert({
            user_id: user.id,
            place_id: placeId,
            memo: memo.trim() || null,
            photos,
          });
        if (insErr) throw new Error(insErr.message);
      }
      setDone(true);
    } catch (err) {
      await removeUploadedPhotos(supabase, uploadedPaths);
      const msg =
        err instanceof UploadError || err instanceof Error
          ? err.message
          : "제출에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="submit-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="submit-modal__box" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="submit-modal__close"
          onClick={onClose}
          aria-label="닫기"
        >
          ✕
        </button>
        <p className="submit-modal__eyebrow">{eyebrow}</p>
        <h2 className="submit-modal__title">{title}</h2>

        {done ? (
          <>
            <p className="submit-modal__desc">
              제출해 주셔서 감사합니다. 확인 후 반영됩니다.
            </p>
            <button
              type="button"
              className="submit-modal__submit"
              onClick={onClose}
            >
              닫기
            </button>
          </>
        ) : (
          <form className="submit-form" onSubmit={handleSubmit}>
            {isReport && (
              <label className="submit-form__field">
                <span className="submit-form__label">
                  네이버 지도 URL (필수)
                </span>
                <input
                  className="submit-form__input"
                  type="url"
                  value={naverUrl}
                  onChange={(e) => setNaverUrl(e.target.value)}
                  placeholder="https://map.naver.com/..."
                  required
                />
              </label>
            )}

            <ImagePicker
              files={files}
              onChange={handleFilesChange}
              label={isReport ? "사진 (여러 장 가능)" : "사진 (선택)"}
            />

            <label className="submit-form__field">
              <span className="submit-form__label">메모</span>
              <textarea
                className="submit-form__textarea"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder={
                  isReport
                    ? "작업하기 좋은 이유, 콘센트/와이파이 등"
                    : "어떤 정보가 바뀌었나요? (콘센트, 영업시간 등)"
                }
                rows={3}
              />
            </label>

            {error && <p className="submit-form__error">{error}</p>}

            <button
              type="submit"
              className="submit-modal__submit"
              disabled={submitting}
            >
              {submitting ? "제출 중..." : submitLabel}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
