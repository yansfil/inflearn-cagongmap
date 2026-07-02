import { redirect } from "next/navigation";

/** /admin 진입 시 제보 화면으로 보낸다. */
export default function AdminIndex() {
  redirect("/admin/reports");
}
