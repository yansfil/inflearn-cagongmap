import "server-only";

/**
 * 서버 전용 구조화 로거.
 *
 * 왜 서버 전용인가: 클라이언트 콘솔 로그는 로그 수집기로 가지 않아 관측 대상이
 * 될 수 없다. 저장/수정/삭제, 로그인, 외부 API 호출처럼 나중에 추적해야 하는
 * 이벤트는 반드시 서버(Server Action / route handler / 서버 컴포넌트)에서 이
 * 로거로 남긴다. UI 상태 표시용 클라이언트 console 은 그대로 두어도 되지만,
 * 관측이 필요한 이벤트를 클라이언트에만 남기면 안 된다.
 *
 * 출력: 한 줄 JSON(구조화 로그). 필드는 항상 아래 규약을 따른다.
 *   - time    : ISO8601 타임스탬프 (언제)
 *   - level   : debug|info|warn|error
 *   - event   : 어떤 흐름인지 나타내는 점 표기 이름 (예: "admin.place.create")
 *   - request_id / user_id : 추적값(있을 때만) — 하나의 흐름을 이어붙일 키
 *   - outcome : "ok" | "fail" 등 결과
 *   - ...ctx  : 그 외 구조화 필드(소요시간 duration_ms 등)
 *
 * 레벨 필터: 운영에서 debug 가 새지 않도록 환경으로 최소 레벨을 정한다.
 *   - LOG_LEVEL 이 있으면 그 값을 최소 레벨로 사용
 *   - 없으면 NODE_ENV === "production" 은 "info", 그 외는 "debug"
 * 최소 레벨보다 낮은 로그는 아예 출력하지 않는다.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveMinLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw && raw in LEVEL_ORDER) return raw as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const MIN_LEVEL = resolveMinLevel();

/** 로그에 절대 원문으로 남기면 안 되는 민감 키(부분 일치, 소문자 비교). */
const SENSITIVE_KEY_PATTERNS = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "service_role",
  "email",
  "phone",
];

const REDACTED = "[REDACTED]";

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p));
}

/**
 * 컨텍스트 객체에서 민감 필드를 마스킹한다.
 * - 키 이름이 민감 패턴이면 값을 [REDACTED] 로 대체
 * - 문자열 값 안의 이메일 형태는 마스킹(a***@example.com)
 * - 중첩 객체/배열은 재귀적으로 처리
 * 원본은 건드리지 않고 새 값을 만든다.
 */
function redact(value: unknown, key?: string): unknown {
  if (key && isSensitiveKey(key)) return REDACTED;

  if (typeof value === "string") return maskEmailsInString(value);
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map((v) => redact(v));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = redact(v, k);
  }
  return out;
}

const EMAIL_RE = /([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

/** 문자열에 섞인 이메일 전체를 첫 글자만 남기고 마스킹한다. */
function maskEmailsInString(s: string): string {
  return s.replace(EMAIL_RE, (_m, first, domain) => `${first}***${domain}`);
}

export interface LogContext {
  /** 하나의 요청/흐름을 잇는 추적값. */
  request_id?: string;
  /** 행위 주체(있을 때만). 이메일이 아니라 uuid 를 넣는다. */
  user_id?: string;
  /** 결과. 성공/실패 등. */
  outcome?: string;
  /** 소요 시간(ms). */
  duration_ms?: number;
  [key: string]: unknown;
}

function emit(level: LogLevel, event: string, ctx?: LogContext): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const record = {
    time: new Date().toISOString(),
    level,
    event,
    ...(redact(ctx ?? {}) as Record<string, unknown>),
  };

  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (event: string, ctx?: LogContext) => emit("debug", event, ctx),
  info: (event: string, ctx?: LogContext) => emit("info", event, ctx),
  warn: (event: string, ctx?: LogContext) => emit("warn", event, ctx),
  error: (event: string, ctx?: LogContext) => emit("error", event, ctx),
};

/** 흐름 하나를 이어붙일 request_id 를 만든다. */
export function newRequestId(): string {
  return crypto.randomUUID();
}
