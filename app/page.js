import KakaoMap from "../components/KakaoMap";
import { getCafes } from "../lib/cafes";

export default async function Home() {
  const cafes = await getCafes();
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  // 키가 없거나 placeholder 그대로면 안내 화면을 보여준다.
  if (!kakaoKey || kakaoKey === "YOUR_KAKAO_JAVASCRIPT_KEY") {
    return (
      <div className="notice">
        <div className="notice__box">
          <h2>카카오맵 키가 필요합니다</h2>
          <p>
            프로젝트 루트의 <code>.env.local.example</code> 을{" "}
            <code>.env.local</code> 로 복사하고{" "}
            <code>NEXT_PUBLIC_KAKAO_MAP_KEY</code> 에 카카오 JavaScript 키를
            넣은 뒤 개발 서버를 다시 시작하세요.
          </p>
        </div>
      </div>
    );
  }

  return <KakaoMap cafes={cafes} appKey={kakaoKey} />;
}
