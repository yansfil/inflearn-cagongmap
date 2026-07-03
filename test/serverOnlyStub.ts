// 테스트 전용: "server-only" 를 무해한 빈 모듈로 대체한다(vitest.config alias).
// 프로덕션 번들에는 포함되지 않으며, 실제 server-only 가드 동작을 바꾸지 않는다.
export {};
