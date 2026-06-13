import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * data/cafes.json 을 읽어 카페 배열을 반환한다.
 * 서버 컴포넌트에서만 호출 (node:fs 사용).
 */
export async function getCafes() {
  const filePath = path.join(process.cwd(), "data", "cafes.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}
