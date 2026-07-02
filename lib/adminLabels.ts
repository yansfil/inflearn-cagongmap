import type { WifiEnum } from "./types";
import { OUTLET_LABEL, NOISE_LABEL, WORK_FIT_LABEL } from "./labels";

/**
 * admin 폼용 라벨. 공개 화면(lib/labels)의 outlet/noise/work_fit 라벨을 재사용하고,
 * places 원본 enum 인 wifi(3단계)는 여기서 라벨을 둔다(공개 화면은 boolean 으로
 * 정규화하므로 3단계 라벨이 없다).
 */
export const WIFI_LABEL: Record<WifiEnum, string> = {
  stable: "있음·안정",
  yes: "있음",
  no: "없음",
};

export { OUTLET_LABEL, NOISE_LABEL, WORK_FIT_LABEL };
