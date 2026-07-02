import { Badge } from "../ui/badge";
import type { SubmissionStatus } from "../../lib/adminReports";

const MAP: Record<
  SubmissionStatus,
  { label: string; variant: "secondary" | "success" | "destructive" }
> = {
  pending: { label: "대기", variant: "secondary" },
  approved: { label: "승인", variant: "success" },
  rejected: { label: "반려", variant: "destructive" },
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const s = MAP[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

/** ISO 문자열 → "2026-07-02 17:41" (로컬). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
