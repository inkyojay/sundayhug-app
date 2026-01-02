/**
 * 쿠팡 로켓그로스 연동 상태 페이지
 */

import type { Route } from "./+types/coupang-status";

import {
  PackageIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  ShoppingCartIcon,
  BoxIcon,
  WarehouseIcon,
  ClockIcon,
  SaveIcon,
  UnlinkIcon,
  LinkIcon,
  LoaderIcon,
  CalendarIcon,
} from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

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
import { Label } from "~/core/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { Separator } from "~/core/components/ui/separator";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: "쿠팡 로켓그로스 연동 | Sundayhug Admin" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  // 활성화된 인증 정보 조회
  const { data: credentials } = await supabase
    .from("coupang_credentials")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 동기화 로그 조회
  const { data: syncLogs } = await supabase
    .from("coupang_sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  // 상품 통계
  const { count: productCount } = await supabase
    .from("coupang_products")
    .select("*", { count: "exact", head: true });

  const { count: optionCount } = await supabase
    .from("coupang_product_options")
    .select("*", { count: "exact", head: true });

  // 주문 통계 (최근 30일)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("shop_cd", "coupang")
    .gte("ord_time", thirtyDaysAgo.toISOString());

  return {
    credentials,
    syncLogs: syncLogs || [],
    stats: {
      products: productCount || 0,
      options: optionCount || 0,
      orders: orderCount || 0,
    },
  };
}

function formatDate(dateString: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null) {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}

export default function CoupangStatus({
  loaderData,
}: Route.ComponentProps) {
  const { credentials, syncLogs, stats } = loaderData;

  const authFetcher = useFetcher();
  const orderSyncFetcher = useFetcher();
  const productSyncFetcher = useFetcher();
  const inventorySyncFetcher = useFetcher();

  const [formData, setFormData] = useState({
    vendor_id: credentials?.vendor_id || "",
    vendor_name: credentials?.vendor_name || "",
    access_key: credentials?.access_key || "",
    secret_key: "", // 보안상 빈 값으로 시작
  });

  const [syncDateRange, setSyncDateRange] = useState({
    date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    date_to: new Date().toISOString().slice(0, 10),
  });

  const isConnected = credentials?.is_active;

  const handleSaveCredentials = () => {
    const form = new FormData();
    form.append("intent", "save");
    form.append("vendor_id", formData.vendor_id);
    form.append("vendor_name", formData.vendor_name);
    form.append("access_key", formData.access_key);
    form.append("secret_key", formData.secret_key || credentials?.secret_key || "");

    authFetcher.submit(form, {
      method: "post",
      action: "/api/integrations/coupang/auth/save",
    });
  };

  const handleDisconnect = () => {
    if (!confirm("쿠팡 연동을 해제하시겠습니까?")) return;

    const form = new FormData();
    form.append("intent", "disconnect");
    form.append("vendor_id", credentials?.vendor_id || "");

    authFetcher.submit(form, {
      method: "post",
      action: "/api/integrations/coupang/auth/save",
    });
  };

  const handleReconnect = () => {
    const form = new FormData();
    form.append("intent", "reconnect");
    form.append("vendor_id", credentials?.vendor_id || "");

    authFetcher.submit(form, {
      method: "post",
      action: "/api/integrations/coupang/auth/save",
    });
  };

  const handleSyncOrders = () => {
    const form = new FormData();
    form.append("vendor_id", credentials?.vendor_id || "");
    form.append("date_from", syncDateRange.date_from);
    form.append("date_to", syncDateRange.date_to);

    orderSyncFetcher.submit(form, {
      method: "post",
      action: "/api/integrations/coupang/sync-orders",
    });
  };

  const handleSyncProducts = () => {
    const form = new FormData();
    form.append("vendor_id", credentials?.vendor_id || "");
    form.append("fetch_details", "true");

    productSyncFetcher.submit(form, {
      method: "post",
      action: "/api/integrations/coupang/sync-products",
    });
  };

  const handleSyncInventory = () => {
    const form = new FormData();
    form.append("vendor_id", credentials?.vendor_id || "");

    inventorySyncFetcher.submit(form, {
      method: "post",
      action: "/api/integrations/coupang/sync-inventory",
    });
  };

  const isSyncing =
    orderSyncFetcher.state === "submitting" ||
    productSyncFetcher.state === "submitting" ||
    inventorySyncFetcher.state === "submitting";

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageIcon className="w-6 h-6" />
            쿠팡 로켓그로스 연동
          </h1>
          <p className="text-muted-foreground">
            쿠팡 로켓그로스 API를 통해 주문, 상품, 재고를 동기화합니다.
          </p>
        </div>
        {isConnected && (
          <Badge variant="default" className="text-lg px-4 py-2">
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            연동됨
          </Badge>
        )}
      </div>

      {/* 알림 메시지 */}
      {authFetcher.data?.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {authFetcher.data.message}
        </div>
      )}
      {authFetcher.data?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {authFetcher.data.error}
        </div>
      )}
      {orderSyncFetcher.data?.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {orderSyncFetcher.data.message}
        </div>
      )}
      {orderSyncFetcher.data?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {orderSyncFetcher.data.error}
        </div>
      )}
      {productSyncFetcher.data?.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {productSyncFetcher.data.message}
        </div>
      )}
      {productSyncFetcher.data?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {productSyncFetcher.data.error}
        </div>
      )}
      {inventorySyncFetcher.data?.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {inventorySyncFetcher.data.message}
        </div>
      )}
      {inventorySyncFetcher.data?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {inventorySyncFetcher.data.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 인증 정보 및 동기화 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 인증 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                API 인증 정보
              </CardTitle>
              <CardDescription>
                쿠팡 Wing에서 발급받은 Open API 인증 정보를 입력하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>판매자 ID (Vendor ID)</Label>
                  <Input
                    placeholder="A00123456"
                    value={formData.vendor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor_id: e.target.value })
                    }
                    disabled={isConnected}
                  />
                </div>
                <div className="space-y-2">
                  <Label>판매자명 (선택)</Label>
                  <Input
                    placeholder="썬데이허그"
                    value={formData.vendor_name}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access Key</Label>
                <Input
                  placeholder="쿠팡에서 발급받은 Access Key"
                  value={formData.access_key}
                  onChange={(e) =>
                    setFormData({ ...formData, access_key: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <Input
                  type="password"
                  placeholder={
                    credentials?.secret_key
                      ? "저장된 키가 있습니다. 변경 시 입력하세요."
                      : "쿠팡에서 발급받은 Secret Key"
                  }
                  value={formData.secret_key}
                  onChange={(e) =>
                    setFormData({ ...formData, secret_key: e.target.value })
                  }
                />
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveCredentials}
                  disabled={
                    authFetcher.state === "submitting" ||
                    !formData.vendor_id ||
                    !formData.access_key
                  }
                >
                  {authFetcher.state === "submitting" ? (
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <SaveIcon className="w-4 h-4 mr-2" />
                  )}
                  {credentials ? "업데이트" : "연동하기"}
                </Button>

                {credentials && isConnected && (
                  <Button variant="outline" onClick={handleDisconnect}>
                    <UnlinkIcon className="w-4 h-4 mr-2" />
                    연동 해제
                  </Button>
                )}

                {credentials && !isConnected && (
                  <Button variant="outline" onClick={handleReconnect}>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    재연동
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 데이터 동기화 */}
          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCwIcon className="w-5 h-5" />
                  데이터 동기화
                </CardTitle>
                <CardDescription>
                  쿠팡에서 주문, 상품, 재고 데이터를 가져옵니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 주문 동기화 */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCartIcon className="w-5 h-5" />
                      <span className="font-medium">주문 동기화</span>
                    </div>
                    <Badge variant="secondary">
                      최근 30일: {stats.orders}건
                    </Badge>
                  </div>

                  <div className="flex items-end gap-4">
                    <div className="space-y-2">
                      <Label>시작일</Label>
                      <Input
                        type="date"
                        value={syncDateRange.date_from}
                        onChange={(e) =>
                          setSyncDateRange({
                            ...syncDateRange,
                            date_from: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일</Label>
                      <Input
                        type="date"
                        value={syncDateRange.date_to}
                        onChange={(e) =>
                          setSyncDateRange({
                            ...syncDateRange,
                            date_to: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button
                      onClick={handleSyncOrders}
                      disabled={isSyncing}
                    >
                      {orderSyncFetcher.state === "submitting" ? (
                        <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="w-4 h-4 mr-2" />
                      )}
                      주문 동기화
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    최대 30일까지 조회 가능합니다.
                  </p>
                </div>

                {/* 상품 동기화 */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BoxIcon className="w-5 h-5" />
                      <span className="font-medium">상품 동기화</span>
                      <Badge variant="secondary">
                        {stats.products}개 상품 / {stats.options}개 옵션
                      </Badge>
                    </div>
                    <Button
                      onClick={handleSyncProducts}
                      disabled={isSyncing}
                    >
                      {productSyncFetcher.state === "submitting" ? (
                        <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="w-4 h-4 mr-2" />
                      )}
                      상품 동기화
                    </Button>
                  </div>
                </div>

                {/* 재고 동기화 */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <WarehouseIcon className="w-5 h-5" />
                      <span className="font-medium">재고 동기화</span>
                    </div>
                    <Button
                      onClick={handleSyncInventory}
                      disabled={isSyncing}
                    >
                      {inventorySyncFetcher.state === "submitting" ? (
                        <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="w-4 h-4 mr-2" />
                      )}
                      재고 동기화
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 오른쪽: 연동 정보 및 로그 */}
        <div className="space-y-6">
          {/* 연동 상태 */}
          <Card>
            <CardHeader>
              <CardTitle>연동 상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">상태</span>
                {isConnected ? (
                  <Badge variant="default">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    활성
                  </Badge>
                ) : credentials ? (
                  <Badge variant="secondary">
                    <XCircleIcon className="w-4 h-4 mr-1" />
                    비활성
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertCircleIcon className="w-4 h-4 mr-1" />
                    미연동
                  </Badge>
                )}
              </div>

              {credentials && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">판매자 ID</span>
                      <span className="font-mono">{credentials.vendor_id}</span>
                    </div>
                    {credentials.vendor_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">판매자명</span>
                        <span>{credentials.vendor_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">마지막 동기화</span>
                      <span>{formatDate(credentials.last_sync_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">연동일</span>
                      <span>{formatDate(credentials.created_at)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Rate Limit 안내 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API 제한 사항</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Rate Limit:</strong> 분당 50회
                </p>
                <p>
                  <strong>주문 조회:</strong> 최대 30일
                </p>
                <p>
                  <strong>인증 방식:</strong> HMAC-SHA256
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 동기화 로그 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            동기화 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              동기화 이력이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>성공</TableHead>
                  <TableHead>실패</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>소요시간</TableHead>
                  <TableHead>일시</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {log.sync_type === "orders"
                          ? "주문"
                          : log.sync_type === "products"
                            ? "상품"
                            : "재고"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === "success"
                            ? "default"
                            : log.status === "partial"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {log.status === "success"
                          ? "성공"
                          : log.status === "partial"
                            ? "부분"
                            : "실패"}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.items_synced || 0}</TableCell>
                    <TableCell>{log.items_failed || 0}</TableCell>
                    <TableCell>
                      {log.date_from && log.date_to
                        ? `${log.date_from} ~ ${log.date_to}`
                        : "-"}
                    </TableCell>
                    <TableCell>{formatDuration(log.duration_ms)}</TableCell>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
