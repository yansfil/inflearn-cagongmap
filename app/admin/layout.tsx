import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "../../lib/admin";
import "./admin.css";

export const metadata = {
  title: "운영 콘솔",
  robots: { index: false, follow: false },
};

/**
 * /admin 전역 가드 + 레이아웃.
 *
 * 서버에서 쿠키 세션 사용자를 확인해 관리자가 아니면 홈으로 리다이렉트한다.
 * (미들웨어는 세션 갱신만 담당하고, 접근 차단은 여기서 서버 컴포넌트로 한다.)
 * 각 Server Action 도 requireAdmin 으로 독립 재검증한다(이중 방어).
 *
 * admin.css 가 Tailwind(admin 스코프)를 로드한다.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/");
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-header__inner">
          <Link href="/admin/reports" className="admin-header__brand">
            카공맵 운영 콘솔
          </Link>
          <nav className="admin-nav">
            <Link href="/admin/reports">제보</Link>
            <Link href="/admin/places">장소</Link>
          </nav>
          <span className="admin-header__user">{admin.email}</span>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
