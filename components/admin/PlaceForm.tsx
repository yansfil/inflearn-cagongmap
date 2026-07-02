"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select } from "../ui/select";
import { Card, CardContent } from "../ui/card";
import {
  OUTLET_LABEL,
  NOISE_LABEL,
  WORK_FIT_LABEL,
  WIFI_LABEL,
} from "../../lib/adminLabels";
import {
  OUTLET_VALUES,
  WIFI_VALUES,
  NOISE_VALUES,
  WORK_FIT_VALUES,
} from "../../lib/adminPlaces";
import type { PlaceRow } from "../../lib/types";
import type { ActionResult } from "../../app/admin/actions";
import { PhotoManager } from "./PhotoManager";

type Action = (
  prev: ActionResult | null,
  form: FormData
) => Promise<ActionResult>;

export interface PlaceFormProps {
  mode: "create" | "edit";
  action: Action;
  /** 수정 모드: 기존 장소. 추가 모드: 제보 프리필용 부분값. */
  initial?: Partial<PlaceRow> | null;
  /** 제보에서 넘어온 경우 승인 처리에 쓸 id. */
  submissionId?: string | null;
  editRequestId?: string | null;
  /** 제보/기존 장소에서 가져온 사진 후보(프리필). */
  initialPhotos?: string[];
}

function SubmitButton({
  mode,
  uploading,
}: {
  mode: "create" | "edit";
  uploading: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = pending || uploading;
  return (
    <Button type="submit" disabled={disabled}>
      {uploading
        ? "사진 업로드 중..."
        : pending
        ? "저장 중..."
        : mode === "create"
        ? "장소 추가"
        : "장소 수정"}
    </Button>
  );
}

export function PlaceForm({
  mode,
  action,
  initial,
  submissionId,
  editRequestId,
  initialPhotos,
}: PlaceFormProps) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    action,
    null
  );
  const [photos, setPhotos] = useState<string[]>(
    initialPhotos ?? initial?.photos ?? []
  );
  // 사진 업로드 진행 중에는 저장을 막아, 방금 올린 사진이 누락된 채 저장되는 걸 방지.
  const [uploading, setUploading] = useState(false);

  return (
    <form action={formAction} className="grid gap-6 max-w-2xl">
      {mode === "edit" && initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      {submissionId ? (
        <input type="hidden" name="submission_id" value={submissionId} />
      ) : null}
      {editRequestId ? (
        <input type="hidden" name="edit_request_id" value={editRequestId} />
      ) : null}
      {/* photos 는 PhotoManager 가 관리하는 URL 배열을 JSON 으로 담아 넘긴다. */}
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <Field label="이름 *" htmlFor="name">
            <Input id="name" name="name" defaultValue={initial?.name ?? ""} required />
          </Field>
          <Field label="주소 *" htmlFor="address">
            <Input
              id="address"
              name="address"
              defaultValue={initial?.address ?? ""}
              required
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="위도(lat) *" htmlFor="lat">
              <Input
                id="lat"
                name="lat"
                type="number"
                step="any"
                defaultValue={initial?.lat ?? ""}
                required
              />
            </Field>
            <Field label="경도(lng) *" htmlFor="lng">
              <Input
                id="lng"
                name="lng"
                type="number"
                step="any"
                defaultValue={initial?.lng ?? ""}
                required
              />
            </Field>
          </div>
          <Field label="네이버 플레이스 URL" htmlFor="naver_place_url">
            <Input
              id="naver_place_url"
              name="naver_place_url"
              defaultValue={initial?.naver_place_url ?? ""}
              placeholder="https://map.naver.com/p/entry/place/..."
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="여는 시간 (HH:MM)" htmlFor="open_time">
              <Input
                id="open_time"
                name="open_time"
                type="time"
                defaultValue={initial?.open_time?.slice(0, 5) ?? ""}
              />
            </Field>
            <Field label="닫는 시간 (HH:MM)" htmlFor="close_time">
              <Input
                id="close_time"
                name="close_time"
                type="time"
                defaultValue={initial?.close_time?.slice(0, 5) ?? ""}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_24h"
              defaultChecked={initial?.is_24h ?? false}
            />
            24시간 영업
          </label>
          <Field label="아이스 아메리카노 가격 (원)" htmlFor="iced_americano_price">
            <Input
              id="iced_americano_price"
              name="iced_americano_price"
              type="number"
              min="0"
              defaultValue={initial?.iced_americano_price ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <Field label="콘센트" htmlFor="outlet">
            <Select id="outlet" name="outlet" defaultValue={initial?.outlet ?? ""}>
              <option value="">선택 안 함</option>
              {OUTLET_VALUES.map((v) => (
                <option key={v} value={v}>
                  {OUTLET_LABEL[v]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="와이파이" htmlFor="wifi">
            <Select id="wifi" name="wifi" defaultValue={initial?.wifi ?? ""}>
              <option value="">선택 안 함</option>
              {WIFI_VALUES.map((v) => (
                <option key={v} value={v}>
                  {WIFI_LABEL[v]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="소음" htmlFor="noise">
            <Select id="noise" name="noise" defaultValue={initial?.noise ?? ""}>
              <option value="">선택 안 함</option>
              {NOISE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {NOISE_LABEL[v]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="작업 적합도" htmlFor="work_fit">
            <Select
              id="work_fit"
              name="work_fit"
              defaultValue={initial?.work_fit ?? ""}
            >
              <option value="">선택 안 함</option>
              {WORK_FIT_VALUES.map((v) => (
                <option key={v} value={v}>
                  {WORK_FIT_LABEL[v]}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <Field label="태그 (쉼표로 구분)" htmlFor="tags">
            <Textarea
              id="tags"
              name="tags"
              defaultValue={(initial?.tags ?? []).join(", ")}
              placeholder="넓은매장, 콘센트많음, 심야영업"
            />
          </Field>
          <div className="grid gap-2">
            <Label>사진</Label>
            <PhotoManager
              photos={photos}
              onChange={setPhotos}
              onBusyChange={setUploading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <SubmitButton mode={mode} uploading={uploading} />
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
