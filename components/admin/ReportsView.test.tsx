import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsView } from "./ReportsView";
import type {
  EditRequestReport,
  SubmissionReport,
} from "../../lib/adminReports";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  rejectSubmissionAction: vi.fn(async () => ({ ok: true })),
  rejectEditRequestAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}));

vi.mock("../../app/admin/actions", () => ({
  rejectSubmissionAction: mocks.rejectSubmissionAction,
  rejectEditRequestAction: mocks.rejectEditRequestAction,
}));

function makeSubmission(
  overrides: Partial<SubmissionReport> = {}
): SubmissionReport {
  return {
    id: "sub-pending",
    user_id: "user-submission",
    user_email: "submitter@example.com",
    naver_place_url: "https://map.naver.com/p/entry/place/pending",
    memo: "새 카페입니다.",
    photos: ["https://example.com/sub.jpg"],
    status: "pending",
    created_at: "2026-07-02T09:00:00.000Z",
    ...overrides,
  };
}

function makeEdit(overrides: Partial<EditRequestReport> = {}): EditRequestReport {
  return {
    id: "edit-pending",
    user_id: "user-edit",
    user_email: "editor@example.com",
    place_id: "place-1",
    place_name: "수정 대상 카페",
    memo: "사진을 바꿔주세요.",
    photos: [],
    status: "pending",
    created_at: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("ReportsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("상태 필터로 제보와 수정 요청을 함께 거른다", async () => {
    const user = userEvent.setup();
    render(
      <ReportsView
        submissions={[
          makeSubmission(),
          makeSubmission({
            id: "sub-approved",
            naver_place_url: "https://map.naver.com/p/entry/place/approved",
            status: "approved",
          }),
        ]}
        editRequests={[
          makeEdit(),
          makeEdit({
            id: "edit-rejected",
            place_id: "place-2",
            place_name: "반려된 카페",
            status: "rejected",
          }),
        ]}
      />
    );

    expect(screen.getByText("https://map.naver.com/p/entry/place/pending"))
      .toBeInTheDocument();
    expect(screen.getByText("https://map.naver.com/p/entry/place/approved"))
      .toBeInTheDocument();
    expect(screen.getByText("수정 대상 카페")).toBeInTheDocument();
    expect(screen.getByText("반려된 카페")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox"), "pending");

    expect(screen.getByText("https://map.naver.com/p/entry/place/pending"))
      .toBeInTheDocument();
    expect(screen.queryByText("https://map.naver.com/p/entry/place/approved"))
      .not.toBeInTheDocument();
    expect(screen.getByText("수정 대상 카페")).toBeInTheDocument();
    expect(screen.queryByText("반려된 카페")).not.toBeInTheDocument();
  });

  it("새 카페 제보 승인 버튼은 장소 추가 화면으로 보낸다", async () => {
    const user = userEvent.setup();
    render(
      <ReportsView
        submissions={[makeSubmission()]}
        editRequests={[]}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: "제보 확인: https://map.naver.com/p/entry/place/pending",
      })
    );
    await user.click(screen.getByRole("button", { name: /승인.*장소 추가/ }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/admin/places/new?submission=sub-pending"
    );
  });

  it("정보 수정 요청 승인 버튼은 장소 수정 화면으로 보낸다", async () => {
    const user = userEvent.setup();
    render(
      <ReportsView
        submissions={[]}
        editRequests={[makeEdit({ id: "edit-1", place_id: "place-77" })]}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "수정 요청 확인: 수정 대상 카페" })
    );
    await user.click(screen.getByRole("button", { name: /승인.*장소 수정/ }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/admin/places/place-77/edit?edit_request=edit-1"
    );
  });
});
