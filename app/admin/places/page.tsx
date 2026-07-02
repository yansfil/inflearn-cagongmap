import Link from "next/link";
import { listPlaces } from "../../../lib/adminData";
import { Button } from "../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { OUTLET_LABEL, WIFI_LABEL } from "../../../lib/adminLabels";

export const dynamic = "force-dynamic";

export default async function AdminPlacesPage() {
  const places = await listPlaces();

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold">장소 관리</h1>
          <p className="text-sm text-muted-foreground">
            지도에 노출되는 장소 {places.length}곳
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/places/new">장소 추가</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>주소</TableHead>
            <TableHead>콘센트</TableHead>
            <TableHead>와이파이</TableHead>
            <TableHead>사진</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {places.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-muted-foreground">{p.address}</TableCell>
              <TableCell>{p.outlet ? OUTLET_LABEL[p.outlet] : "-"}</TableCell>
              <TableCell>{p.wifi ? WIFI_LABEL[p.wifi] : "-"}</TableCell>
              <TableCell>
                {p.photos && p.photos.length > 0 ? (
                  <Badge variant="secondary">{p.photos.length}장</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/places/${p.id}/edit`}>수정</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {places.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                등록된 장소가 없습니다.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
