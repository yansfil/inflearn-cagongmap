"use client";

import type { KeyboardEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { StatusBadge, formatDateTime } from "./StatusBadge";
import type {
  SubmissionReport,
  EditRequestReport,
  SubmissionStatus,
} from "../../lib/adminReports";
import {
  rejectSubmissionAction,
  rejectEditRequestAction,
} from "../../app/admin/actions";
import { safeHttpUrl } from "../../lib/safeUrl";

type Selected =
  | { kind: "submission"; data: SubmissionReport }
  | { kind: "edit"; data: EditRequestReport }
  | null;

const STATUS_OPTIONS: { value: "all" | SubmissionStatus; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "대기" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
];

export function ReportsView({
  submissions,
  editRequests,
}: {
  submissions: SubmissionReport[];
  editRequests: EditRequestReport[];
}) {
  const [status, setStatus] = useState<"all" | SubmissionStatus>("all");
  const [selected, setSelected] = useState<Selected>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const subs = useMemo(
    () =>
      status === "all"
        ? submissions
        : submissions.filter((s) => s.status === status),
    [submissions, status]
  );
  const edits = useMemo(
    () =>
      status === "all"
        ? editRequests
        : editRequests.filter((s) => s.status === status),
    [editRequests, status]
  );

  function approve() {
    if (!selected) return;
    if (selected.kind === "submission") {
      router.push(`/admin/places/new?submission=${selected.data.id}`);
    } else {
      router.push(
        `/admin/places/${selected.data.place_id}/edit?edit_request=${selected.data.id}`
      );
    }
  }

  function reject() {
    if (!selected) return;
    const { kind, data } = selected;
    startTransition(async () => {
      const res =
        kind === "submission"
          ? await rejectSubmissionAction(data.id)
          : await rejectEditRequestAction(data.id);
      if (res.ok) {
        setSelected(null);
        router.refresh();
      } else {
        alert(res.error ?? "반려에 실패했습니다.");
      }
    });
  }

  function openReport(next: NonNullable<Selected>) {
    setSelected(next);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    next: NonNullable<Selected>
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openReport(next);
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">상태</span>
        <Select
          className="w-32"
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | SubmissionStatus)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">새 카페 제보</h2>
          <span className="text-sm text-muted-foreground">{subs.length}건</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제보자</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>사진</TableHead>
              <TableHead>생성 시각</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-20">확인</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.map((s) => (
              <TableRow
                key={s.id}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => openReport({ kind: "submission", data: s })}
                onKeyDown={(e) =>
                  handleRowKeyDown(e, { kind: "submission", data: s })
                }
              >
                <TableCell>{s.user_email ?? s.user_id.slice(0, 8)}</TableCell>
                <TableCell className="max-w-[240px] truncate text-muted-foreground">
                  {s.naver_place_url}
                </TableCell>
                <TableCell>{s.photos.length}장</TableCell>
                <TableCell>{formatDateTime(s.created_at)}</TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`제보 확인: ${s.naver_place_url}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openReport({ kind: "submission", data: s });
                    }}
                  >
                    확인
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {subs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  제보가 없습니다.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">정보 수정 요청</h2>
          <span className="text-sm text-muted-foreground">{edits.length}건</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제보자</TableHead>
              <TableHead>대상 장소</TableHead>
              <TableHead>사진</TableHead>
              <TableHead>생성 시각</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-20">확인</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {edits.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => openReport({ kind: "edit", data: r })}
                onKeyDown={(e) => handleRowKeyDown(e, { kind: "edit", data: r })}
              >
                <TableCell>{r.user_email ?? r.user_id.slice(0, 8)}</TableCell>
                <TableCell>{r.place_name ?? r.place_id.slice(0, 8)}</TableCell>
                <TableCell>{r.photos.length}장</TableCell>
                <TableCell>{formatDateTime(r.created_at)}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`수정 요청 확인: ${r.place_name ?? r.place_id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openReport({ kind: "edit", data: r });
                    }}
                  >
                    확인
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {edits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  수정 요청이 없습니다.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      <Dialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.kind === "submission"
                    ? "새 카페 제보"
                    : "정보 수정 요청"}
                </DialogTitle>
              </DialogHeader>
              <ReportDetail selected={selected} />
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={reject}
                  disabled={pending || selected.data.status === "rejected"}
                >
                  반려
                </Button>
                <Button onClick={approve} disabled={pending}>
                  {selected.kind === "submission"
                    ? "승인 → 장소 추가"
                    : "승인 → 장소 수정"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportDetail({ selected }: { selected: NonNullable<Selected> }) {
  const { kind, data } = selected;
  return (
    <div className="grid gap-3 text-sm">
      <Row label="제보자">
        {data.user_email ?? data.user_id}
      </Row>
      <Row label="생성 시각">{formatDateTime(data.created_at)}</Row>
      <Row label="상태">
        <StatusBadge status={data.status} />
      </Row>
      {kind === "submission" ? (
        <Row label="URL">
          <SubmissionUrl url={data.naver_place_url} />
        </Row>
      ) : (
        <Row label="대상 장소">{data.place_name ?? data.place_id}</Row>
      )}
      <Row label="메모">{data.memo || "(없음)"}</Row>
      <div className="grid gap-1">
        <span className="text-muted-foreground">사진 ({data.photos.length})</span>
        {data.photos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${url}-${i}`}
                src={url}
                alt=""
                className="w-24 h-24 rounded-md object-cover border border-border"
              />
            ))}
          </div>
        ) : (
          <span>(없음)</span>
        )}
      </div>
    </div>
  );
}

/**
 * 제보 URL 표시. naver_place_url 은 사용자 입력이라 anon 으로 직접 insert 하면
 * `javascript:` 같은 위험 스킴이 들어올 수 있다. http(s) 로 검증된 값만 클릭 가능한
 * 링크로 렌더하고, 그 외에는 평문으로만 보여 관리자 세션에서의 스크립트 실행을 막는다.
 */
function SubmissionUrl({ url }: { url: string }) {
  const safe = safeHttpUrl(url);
  if (safe) {
    return (
      <a
        href={safe}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline break-all"
      >
        {safe}
      </a>
    );
  }
  return (
    <span className="break-all text-muted-foreground">
      {url}{" "}
      <span className="text-destructive">(안전하지 않은 URL — 링크 비활성화)</span>
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
