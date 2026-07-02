import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./safeUrl";

describe("safeHttpUrl", () => {
  it("http/https 는 그대로 통과한다", () => {
    expect(safeHttpUrl("https://map.naver.com/p/1")).toBe(
      "https://map.naver.com/p/1"
    );
    expect(safeHttpUrl("http://naver.me/abc")).toBe("http://naver.me/abc");
  });

  it("앞뒤 공백은 트림해 통과한다", () => {
    expect(safeHttpUrl("  https://naver.me/x  ")).toBe("https://naver.me/x");
  });

  it("javascript: URI 는 차단한다(저장형 XSS 방지)", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    // 대소문자·공백 섞은 우회 시도도 URL 파서가 스킴을 정규화해 차단
    expect(safeHttpUrl("JavaScript:alert(1)")).toBeNull();
    expect(safeHttpUrl("  javascript:fetch('/admin')  ")).toBeNull();
  });

  it("data:·vbscript: 등 다른 위험 스킴도 차단한다", () => {
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
  });

  it("파싱 불가·상대경로·빈 값은 null", () => {
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("/admin/places")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("   ")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});
