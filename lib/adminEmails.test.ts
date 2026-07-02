import { describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminEmails } from "./adminEmails";

describe("parseAdminEmails", () => {
  it("쉼표로 나누고 소문자·트림한다", () => {
    const set = parseAdminEmails(" Graby@Kakao.com , foo@bar.com ");
    expect(set.has("graby@kakao.com")).toBe(true);
    expect(set.has("foo@bar.com")).toBe(true);
  });

  it("빈 값·undefined 는 빈 집합", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails("").size).toBe(0);
    expect(parseAdminEmails("  ").size).toBe(0);
  });

  it("빈 항목은 걸러낸다", () => {
    expect(parseAdminEmails("a@b.com,,").size).toBe(1);
  });
});

describe("isAdminEmail", () => {
  const raw = "graby@kakao.com";

  it("목록에 있으면 대소문자 무시하고 true", () => {
    expect(isAdminEmail("graby@kakao.com", raw)).toBe(true);
    expect(isAdminEmail("GRABY@kakao.com", raw)).toBe(true);
    expect(isAdminEmail("  graby@kakao.com ", raw)).toBe(true);
  });

  it("목록에 없으면 false", () => {
    expect(isAdminEmail("someone@else.com", raw)).toBe(false);
  });

  it("null/undefined/빈 이메일은 false", () => {
    expect(isAdminEmail(null, raw)).toBe(false);
    expect(isAdminEmail(undefined, raw)).toBe(false);
    expect(isAdminEmail("", raw)).toBe(false);
  });

  it("ADMIN_EMAILS 가 비어 있으면 누구도 관리자가 아니다", () => {
    expect(isAdminEmail("graby@kakao.com", "")).toBe(false);
  });
});
