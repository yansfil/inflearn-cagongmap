import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      // 테스트 환경(jsdom)에서는 "server-only" 가드가 예외를 던진다.
      // 순수 로직(예: toCafe) 테스트가 server-only 모듈을 간접 import 해도
      // 로드되도록 빈 모듈로 대체한다. 실제 앱 런타임에는 영향 없다.
      "server-only": fileURLToPath(
        new URL("./test/serverOnlyStub.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
