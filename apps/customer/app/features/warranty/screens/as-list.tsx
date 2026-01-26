/**
 * A/S 관리 - 목록 (관리자용)
 */
import type { Route } from "./+types/as-list";

import {
  WrenchIcon,
  SearchIcon,
  FilterIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { LoadingTable } from "~/core/components/ui/loading";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `A/S 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "all";
  const typeFilter = url.searchParams.get("type") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // A/S 신청 목록 쿼리
  let query = supabase
    .from("as_requests")
    .select(`
      id,
      request_type,
      issue_description,
      status,
      contact_name,
      contact_phone,
      created_at,
      completed_at,
      warranties (
        warranty_number,
        product_name,
        customers (
          name
        )
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  // 상태 필터
  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  // 유형 필터
  if (typeFilter !== "all") {
    query = query.eq("request_type", typeFilter);
  }

  // 페이지네이션
  query = query.range(offset, offset + limit - 1);

  const { data: asRequests, count } = await query;

  // 통계
  const { data: allRequests } = await supabase
    .from("as_requests")
    .select("status, request_type");

  const stats = {
    total: allRequests?.length || 0,
    received: allRequests?.filter(r => r.status === "received").length || 0,
    processing: allRequests?.filter(r => r.status === "processing").length || 0,
    completed: allRequests?.filter(r => r.status === "completed").length || 0,
  };

  return {
    asRequests: asRequests || [],
    stats,
    totalCount: count || 0,
    currentPage: page,
    totalPages: Math.ceil((count || 0) / limit),
    statusFilter,
    typeFilter,
  };
}

export default function ASList({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation(["warranty", "common"]);
  const navigation = useNavigation();
  const { asRequests, stats, totalCount, currentPage, totalPages, statusFilter, typeFilter } = loaderData;

  const isLoading = navigation.state === "loading";

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    received: { label: t("warranty:admin.asManagement.status.received"), variant: "outline" },
    processing: { label: t("warranty:admin.asManagement.status.processing"), variant: "secondary" },
    completed: { label: t("warranty:admin.asManagement.status.completed"), variant: "default" },
    cancelled: { label: t("warranty:admin.asManagement.status.cancelled"), variant: "destructive" },
  };

  const typeConfig: Record<string, string> = {
    repair: t("warranty:admin.asManagement.types.repair"),
    exchange: t("warranty:admin.asManagement.types.exchange"),
    refund: t("warranty:admin.asManagement.types.refund"),
    inquiry: t("warranty:admin.asManagement.types.inquiry"),
  };

  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newStatus = overrides.status !== undefined ? overrides.status : statusFilter;
    const newType = overrides.type !== undefined ? overrides.type : typeFilter;
    const newPage = overrides.page !== undefined ? overrides.page : "1";

    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newType && newType !== "all") params.set("type", newType);
    if (newPage && newPage !== "1") params.set("page", newPage);
    
    const queryString = params.toString();
    return `/dashboard/warranty/as${queryString ? `?${queryString}` : ""}`;
  };

  const handleFilterChange = (filterType: string, value: string) => {
    window.location.href = buildUrl({ [filterType]: value === "all" ? null : value });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WrenchIcon className="h-6 w-6" />
            {t("warranty:admin.asManagement.title")}
          </h1>
          <p className="text-muted-foreground">{t("warranty:admin.asManagement.subtitle")}</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/dashboard/warranty">{t("warranty:admin.asManagement.backToWarrantyList")}</a>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("warranty:admin.asManagement.stats.total")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "received")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
              {t("warranty:admin.asManagement.stats.received")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.received}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "processing")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <ClockIcon className="h-4 w-4 text-blue-500" />
              {t("warranty:admin.asManagement.stats.processing")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "completed")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              {t("warranty:admin.asManagement.stats.completed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />

            <Select value={statusFilter} onValueChange={(v) => handleFilterChange("status", v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t("warranty:admin.asManagement.filter.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("warranty:admin.asManagement.filter.all")}</SelectItem>
                <SelectItem value="received">{t("warranty:admin.asManagement.status.received")}</SelectItem>
                <SelectItem value="processing">{t("warranty:admin.asManagement.status.processing")}</SelectItem>
                <SelectItem value="completed">{t("warranty:admin.asManagement.status.completed")}</SelectItem>
                <SelectItem value="cancelled">{t("warranty:admin.asManagement.status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => handleFilterChange("type", v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t("warranty:admin.asManagement.filter.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("warranty:admin.asManagement.filter.all")}</SelectItem>
                <SelectItem value="repair">{t("warranty:admin.asManagement.types.repair")}</SelectItem>
                <SelectItem value="exchange">{t("warranty:admin.asManagement.types.exchange")}</SelectItem>
                <SelectItem value="refund">{t("warranty:admin.asManagement.types.refund")}</SelectItem>
                <SelectItem value="inquiry">{t("warranty:admin.asManagement.types.inquiry")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* A/S 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("warranty:admin.asManagement.requestList")}</CardTitle>
          <CardDescription>{t("warranty:admin.asManagement.totalItems", { count: totalCount })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingTable columns={7} rows={10} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("warranty:admin.asManagement.table.warrantyNumber")}</TableHead>
                  <TableHead>{t("warranty:admin.asManagement.table.customer")}</TableHead>
                  <TableHead>{t("warranty:admin.asManagement.table.product")}</TableHead>
                  <TableHead>{t("warranty:admin.asManagement.table.type")}</TableHead>
                  <TableHead>{t("warranty:admin.asManagement.table.content")}</TableHead>
                  <TableHead>{t("warranty:admin.asManagement.table.status")}</TableHead>
                  <TableHead>{t("warranty:admin.asManagement.table.requestDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asRequests.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.warranties?.warranty_number || "-"}
                    </TableCell>
                    <TableCell>
                      {item.contact_name || item.warranties?.customers?.name || "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {item.warranties?.product_name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeConfig[item.request_type] || item.request_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {item.issue_description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[item.status]?.variant || "outline"}>
                        {statusConfig[item.status]?.label || item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("ko-KR")}
                    </TableCell>
                  </TableRow>
                ))}
                {asRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("warranty:admin.asManagement.noRequests")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t("warranty:admin.asManagement.pagination.page", { current: currentPage, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => window.location.href = buildUrl({ page: String(currentPage - 1) })}
                >
                  {t("warranty:admin.asManagement.pagination.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => window.location.href = buildUrl({ page: String(currentPage + 1) })}
                >
                  {t("warranty:admin.asManagement.pagination.next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

