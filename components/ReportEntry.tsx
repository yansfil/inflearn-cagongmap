"use client";

import { useState } from "react";
import { useAppState } from "./AppStateProvider";
import SubmissionForm from "./SubmissionForm";

/**
 * 좌측 패널 하단의 "새 장소 제보" 진입.
 * 비로그인 사용자가 누르면 로그인 모달을 띄우고, 로그인 상태면 제보 폼을 연다.
 */
export default function ReportEntry() {
  const { user, openLoginPrompt } = useAppState();
  const [open, setOpen] = useState(false);

  function handleClick() {
    if (!user) {
      openLoginPrompt();
      return;
    }
    setOpen(true);
  }

  return (
    <div className="report-entry">
      <button type="button" className="report-entry__btn" onClick={handleClick}>
        + 새 카페 제보
      </button>
      {open && <SubmissionForm kind="report" onClose={() => setOpen(false)} />}
    </div>
  );
}
