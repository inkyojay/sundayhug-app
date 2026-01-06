/**
 * 베스트셀러 TOP 10 테이블 컴포넌트
 *
 * 매출 순위 기준 상위 10개 상품 표시
 */

import { TrophyIcon, PackageIcon } from "lucide-react";
import { Badge } from "~/core/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { formatCurrencyShort } from "~/core/lib/format";
import type { TopProductData } from "../lib/business-dashboard.server";

interface TopProductsTableProps {
  data: TopProductData[];
}

// 순위 뱃지
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600">
        <TrophyIcon className="h-3 w-3 mr-1" />
        1위
      </Badge>
    );
  } else if (rank === 2) {
    return (
      <Badge className="bg-gray-400 hover:bg-gray-500">
        <TrophyIcon className="h-3 w-3 mr-1" />
        2위
      </Badge>
    );
  } else if (rank === 3) {
    return (
      <Badge className="bg-amber-700 hover:bg-amber-800">
        <TrophyIcon className="h-3 w-3 mr-1" />
        3위
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      {rank}위
    </Badge>
  );
}

export function TopProductsTable({ data }: TopProductsTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            베스트셀러 TOP 10
          </CardTitle>
          <CardDescription>매출 기준 상위 상품</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="h-5 w-5" />
          베스트셀러 TOP 10
        </CardTitle>
        <CardDescription>매출 기준 상위 상품</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">순위</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead className="text-right w-[100px]">판매수량</TableHead>
              <TableHead className="text-right w-[120px]">매출</TableHead>
              <TableHead className="text-right w-[80px]">주문수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={`${product.productName}_${product.sku}`} className="hover:bg-muted/30">
                <TableCell>
                  <RankBadge rank={product.rank} />
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px]">
                    <div className="font-medium truncate" title={product.productName}>
                      {product.productName}
                    </div>
                    {product.sku && (
                      <div className="text-xs text-muted-foreground truncate" title={product.sku}>
                        SKU: {product.sku}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {product.quantity.toLocaleString("ko-KR")}개
                </TableCell>
                <TableCell className="text-right font-medium text-blue-600">
                  {formatCurrencyShort(product.totalSales)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {product.orderCount}건
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
