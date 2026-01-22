/**
 * 주문확인서 (패킹슬립) PDF 생성 페이지
 *
 * 선택한 주문들에 대한 주문확인서 PDF 생성
 * - 사은품 공지 편집
 * - QR 코드 URL 설정
 * - 미리보기
 * - PDF 다운로드
 */
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import {
  FileTextIcon,
  DownloadIcon,
  ArrowLeftIcon,
  QrCodeIcon,
  GiftIcon,
  ShieldCheckIcon,
  EyeIcon,
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import { Switch } from "~/core/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/core/components/ui/tabs";

import { PackingSlipDocument, type PackingSlipSettings } from "../lib/pdf-templates/packing-slip";
import type { UnifiedOrder } from "../lib/orders-unified.shared";

export const meta: MetaFunction = () => {
  return [{ title: "주문확인서 생성 | Sundayhug Admin" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const orderKeys = url.searchParams.get("orders")?.split(",").filter(Boolean) || [];

  if (orderKeys.length === 0) {
    return { orders: [] };
  }

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // 주문 정보 조회 (orders 테이블에서 직접 상품 정보 포함)
  const orders: UnifiedOrder[] = [];

  for (const key of orderKeys) {
    const [channel, ...orderNoParts] = key.split("_");
    const orderNo = orderNoParts.join("_");

    if (!channel || !orderNo) continue;

    // orders 테이블에서 해당 주문의 모든 행 조회 (상품별로 행이 분리됨)
    const { data: orderRows } = await adminClient
      .from("orders")
      .select(`
        id,
        uniq,
        shop_cd,
        shop_ord_no,
        ord_status,
        to_name,
        to_tel,
        to_htel,
        to_addr1,
        to_addr2,
        ord_time,
        invoice_no,
        carr_name,
        customer_id,
        shop_sale_name,
        shop_opt_name,
        shop_sku_cd,
        sale_cnt,
        pay_amt,
        sales
      `)
      .eq("shop_cd", channel)
      .eq("shop_ord_no", orderNo);

    if (orderRows && orderRows.length > 0) {
      const firstRow = orderRows[0];

      // 각 행을 상품 아이템으로 변환
      const items = orderRows.map((row: any) => ({
        id: row.id,
        saleName: row.shop_sale_name || "",
        optName: row.shop_opt_name || "",
        skuCd: row.shop_sku_cd || "",
        qty: row.sale_cnt || 1,
        amt: parseFloat(row.pay_amt || 0) || parseFloat(row.sales || 0),
      }));

      orders.push({
        key: `${firstRow.shop_cd}_${firstRow.shop_ord_no}`,
        orderNo: firstRow.shop_ord_no,
        channel: firstRow.shop_cd,
        ordStatus: firstRow.ord_status || "",
        toName: firstRow.to_name || "",
        toTel: firstRow.to_tel || "",
        toHtel: firstRow.to_htel || "",
        toAddr1: firstRow.to_addr1 || "",
        toAddr2: firstRow.to_addr2 || "",
        ordTime: firstRow.ord_time || "",
        invoiceNo: firstRow.invoice_no,
        carrName: firstRow.carr_name,
        customerId: firstRow.customer_id,
        totalAmount: items.reduce((sum: number, i: any) => sum + i.amt, 0),
        totalQty: items.reduce((sum: number, i: any) => sum + i.qty, 0),
        items,
      });
    }
  }

  return { orders };
}

const DEFAULT_SETTINGS: PackingSlipSettings = {
  noticeTitle: "사은품 안내",
  noticeText: "구매해 주셔서 감사합니다!\n작은 사은품을 함께 동봉하였습니다.",
  qrCodeUrl: "https://sundayhug.com/warranty/register",
  qrTitle: "보증서 등록하기",
  qrDescription:
    "QR 코드를 스캔하여 보증서를 등록하시면\nA/S 및 교환 서비스를 더욱 편리하게 이용하실 수 있습니다.",
  showWarrantyInfo: true,
  warrantyText:
    "본 제품은 구매일로부터 1년간 무상 A/S가 제공됩니다.\n보증서 등록 후 A/S 신청이 가능합니다.",
  companyName: "썬데이허그",
  companyPhone: "02-123-4567",
  companyEmail: "cs@sundayhug.com",
};

export default function PackingSlipPage() {
  const { orders } = useLoaderData<typeof loader>();
  const [settings, setSettings] = useState<PackingSlipSettings>(DEFAULT_SETTINGS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<UnifiedOrder | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // QR 코드 생성
  useEffect(() => {
    if (settings.qrCodeUrl) {
      QRCode.toDataURL(settings.qrCodeUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#166534",
          light: "#ffffff",
        },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    } else {
      setQrDataUrl("");
    }
  }, [settings.qrCodeUrl]);

  // 첫 번째 주문을 미리보기용으로 설정
  useEffect(() => {
    if (orders.length > 0 && !previewOrder) {
      setPreviewOrder(orders[0]);
    }
  }, [orders, previewOrder]);

  const handleSettingChange = (key: keyof PackingSlipSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleDownloadSingle = async (order: UnifiedOrder) => {
    setIsGenerating(true);
    try {
      const doc = <PackingSlipDocument order={order} settings={settings} qrCodeDataUrl={qrDataUrl} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `주문확인서_${order.orderNo}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF 생성 오류:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsGenerating(true);
    try {
      for (const order of orders) {
        const doc = <PackingSlipDocument order={order} settings={settings} qrCodeDataUrl={qrDataUrl} />;
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `주문확인서_${order.orderNo}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        // 다운로드 간 약간의 지연
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("PDF 생성 오류:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">선택된 주문이 없습니다</h2>
            <p className="text-muted-foreground mb-4">
              통합 주문 관리에서 주문을 선택한 후 주문확인서를 생성해주세요.
            </p>
            <Link to="/dashboard/orders/unified">
              <Button>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                주문 목록으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileTextIcon className="h-6 w-6 text-blue-500" />
            주문확인서 생성
          </h1>
          <p className="text-muted-foreground">
            {orders.length}개 주문의 주문확인서(보증 안내서) PDF를 생성합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/orders/unified">
            <Button variant="outline">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              주문 목록
            </Button>
          </Link>
          <Button onClick={handleDownloadAll} disabled={isGenerating}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            {isGenerating ? "생성 중..." : `전체 다운로드 (${orders.length}건)`}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 설정 패널 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GiftIcon className="h-5 w-5 text-amber-500" />
                사은품 공지 설정
              </CardTitle>
              <CardDescription>주문확인서에 표시될 사은품/이벤트 공지를 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="noticeTitle">공지 제목</Label>
                <Input
                  id="noticeTitle"
                  value={settings.noticeTitle || ""}
                  onChange={(e) => handleSettingChange("noticeTitle", e.target.value)}
                  placeholder="사은품 안내"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noticeText">공지 내용</Label>
                <Textarea
                  id="noticeText"
                  value={settings.noticeText || ""}
                  onChange={(e) => handleSettingChange("noticeText", e.target.value)}
                  placeholder="사은품 안내 내용을 입력하세요"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5 text-green-500" />
                QR 코드 설정
              </CardTitle>
              <CardDescription>보증서 등록 또는 이벤트 참여 URL을 QR 코드로 표시합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qrCodeUrl">QR 코드 URL</Label>
                <Input
                  id="qrCodeUrl"
                  type="url"
                  value={settings.qrCodeUrl || ""}
                  onChange={(e) => handleSettingChange("qrCodeUrl", e.target.value)}
                  placeholder="https://sundayhug.com/warranty/register"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qrTitle">QR 안내 제목</Label>
                <Input
                  id="qrTitle"
                  value={settings.qrTitle || ""}
                  onChange={(e) => handleSettingChange("qrTitle", e.target.value)}
                  placeholder="보증서 등록하기"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qrDescription">QR 안내 설명</Label>
                <Textarea
                  id="qrDescription"
                  value={settings.qrDescription || ""}
                  onChange={(e) => handleSettingChange("qrDescription", e.target.value)}
                  placeholder="QR 코드 스캔 안내 문구"
                  rows={2}
                />
              </div>
              {qrDataUrl && (
                <div className="flex justify-center pt-2">
                  <img src={qrDataUrl} alt="QR Code Preview" className="w-24 h-24 border rounded" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
                보증 안내 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="showWarrantyInfo">보증 안내 표시</Label>
                <Switch
                  id="showWarrantyInfo"
                  checked={settings.showWarrantyInfo ?? true}
                  onCheckedChange={(checked) => handleSettingChange("showWarrantyInfo", checked)}
                />
              </div>
              {settings.showWarrantyInfo && (
                <div className="space-y-2">
                  <Label htmlFor="warrantyText">보증 안내 문구</Label>
                  <Textarea
                    id="warrantyText"
                    value={settings.warrantyText || ""}
                    onChange={(e) => handleSettingChange("warrantyText", e.target.value)}
                    placeholder="보증 안내 내용"
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>회사 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">회사명</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName || ""}
                    onChange={(e) => handleSettingChange("companyName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">전화번호</Label>
                  <Input
                    id="companyPhone"
                    value={settings.companyPhone || ""}
                    onChange={(e) => handleSettingChange("companyPhone", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">이메일</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={settings.companyEmail || ""}
                  onChange={(e) => handleSettingChange("companyEmail", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 주문 목록 및 미리보기 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>주문 목록 ({orders.length}건)</CardTitle>
              <CardDescription>주문을 클릭하여 미리보기하거나 개별 다운로드할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {orders.map((order) => (
                  <div
                    key={order.key}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      previewOrder?.key === order.key
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setPreviewOrder(order)}
                  >
                    <div>
                      <p className="font-medium">{order.orderNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.toName} | {order.items.length}개 상품 | {order.totalAmount.toLocaleString()}원
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewOrder(order);
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(order);
                        }}
                        disabled={isGenerating}
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 미리보기 정보 */}
          {previewOrder && (
            <Card>
              <CardHeader>
                <CardTitle>미리보기: {previewOrder.orderNo}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">주문자:</span> {previewOrder.toName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">연락처:</span>{" "}
                      {previewOrder.toHtel || previewOrder.toTel}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">주소:</span> {previewOrder.toAddr1}{" "}
                      {previewOrder.toAddr2}
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">상품명</th>
                          <th className="px-3 py-2 text-left">옵션</th>
                          <th className="px-3 py-2 text-center">수량</th>
                          <th className="px-3 py-2 text-right">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewOrder.items.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                            <td className="px-3 py-2">{item.saleName}</td>
                            <td className="px-3 py-2">{item.optName || "-"}</td>
                            <td className="px-3 py-2 text-center">{item.qty}</td>
                            <td className="px-3 py-2 text-right">{item.amt.toLocaleString()}원</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted font-medium">
                        <tr>
                          <td colSpan={2} className="px-3 py-2">
                            합계
                          </td>
                          <td className="px-3 py-2 text-center">{previewOrder.totalQty}</td>
                          <td className="px-3 py-2 text-right">
                            {previewOrder.totalAmount.toLocaleString()}원
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleDownloadSingle(previewOrder)}
                    disabled={isGenerating}
                  >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    이 주문 PDF 다운로드
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
