"use client";

export default function Error({ reset }) {
  return (
    <div className="notice">
      <div className="notice__box">
        <p className="notice__eyebrow">문제가 생겼어요</p>
        <h2>잠시 후 다시 시도해 주세요</h2>
        <p>
          화면을 불러오는 중에 문제가 생겼어요. 잠깐 뒤에 다시 시도하면 대부분
          해결돼요.
        </p>
        <button className="notice__cta" type="button" onClick={() => reset()}>
          다시 시도하기
        </button>
      </div>
    </div>
  );
}
