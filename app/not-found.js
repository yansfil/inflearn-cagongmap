import Link from "next/link";

export const metadata = {
  title: "페이지를 찾을 수 없어요",
};

export default function NotFound() {
  return (
    <div className="notice">
      <div className="notice__box">
        <p className="notice__eyebrow">404</p>
        <h2>페이지를 찾을 수 없어요</h2>
        <p>주소가 바뀌었거나 사라진 페이지예요. 지도로 돌아가서 카페를 찾아보세요.</p>
        <Link className="notice__cta" href="/">
          지도로 돌아가기
        </Link>
      </div>
    </div>
  );
}
