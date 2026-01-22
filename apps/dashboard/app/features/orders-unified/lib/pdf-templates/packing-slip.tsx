/**
 * 주문확인서 (보증 안내서) PDF 템플릿
 *
 * B2C 고객에게 동봉되는 주문 확인 및 보증 안내서
 * - 주문 정보
 * - 상품 목록
 * - 사은품/이벤트 공지
 * - QR 코드 (보증서 등록 링크)
 */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { UnifiedOrder } from "../orders-unified.shared";

// 한글 폰트 등록 (Noto Sans KR - CDN)
Font.register({
  family: "NotoSansKR",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/niceplugin/NotoSans/NotoSansKR-Regular.woff",
      fontWeight: "normal",
    },
    {
      src: "https://cdn.jsdelivr.net/gh/niceplugin/NotoSans/NotoSansKR-Bold.woff",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    fontSize: 10,
    padding: 30,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1e40af",
  },
  logo: {
    width: 120,
    height: 40,
  },
  titleSection: {
    textAlign: "right",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e40af",
  },
  subtitle: {
    fontSize: 9,
    color: "#666",
    marginTop: 3,
  },
  orderInfo: {
    flexDirection: "row",
    marginBottom: 20,
  },
  orderInfoBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f0f9ff",
    marginRight: 10,
  },
  orderInfoBoxLast: {
    marginRight: 0,
  },
  infoTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: 60,
    fontSize: 8,
    color: "#666",
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: "bold",
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    color: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  colNo: { width: "8%", textAlign: "center" },
  colProduct: { width: "42%" },
  colOption: { width: "25%" },
  colQty: { width: "10%", textAlign: "center" },
  colPrice: { width: "15%", textAlign: "right" },
  totalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#1e40af",
  },
  totalBox: {
    width: 150,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#1e40af",
  },
  totalLabel: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 10,
  },
  totalValue: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },
  noticeSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#b45309",
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 9,
    color: "#92400e",
    lineHeight: 1.5,
  },
  qrSection: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#22c55e",
    marginBottom: 20,
  },
  qrCode: {
    width: 80,
    height: 80,
    marginRight: 15,
  },
  qrTextSection: {
    flex: 1,
    justifyContent: "center",
  },
  qrTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 5,
  },
  qrDescription: {
    fontSize: 9,
    color: "#15803d",
    lineHeight: 1.5,
  },
  warrantyInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  warrantyTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 8,
  },
  warrantyText: {
    fontSize: 9,
    color: "#1e3a8a",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
});

export interface PackingSlipSettings {
  noticeTitle?: string;
  noticeText?: string;
  qrCodeUrl?: string;
  qrTitle?: string;
  qrDescription?: string;
  showWarrantyInfo?: boolean;
  warrantyText?: string;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
}

interface PackingSlipDocumentProps {
  order: UnifiedOrder;
  settings: PackingSlipSettings;
  qrCodeDataUrl?: string;
}

const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString("ko-KR")}`;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export function PackingSlipDocument({
  order,
  settings,
  qrCodeDataUrl,
}: PackingSlipDocumentProps) {
  const defaultSettings: PackingSlipSettings = {
    noticeTitle: "사은품 안내",
    noticeText: "구매해 주셔서 감사합니다. 작은 사은품을 함께 동봉하였습니다.",
    qrTitle: "보증서 등록하기",
    qrDescription:
      "QR 코드를 스캔하여 보증서를 등록하시면 A/S 및 교환 서비스를 더욱 편리하게 이용하실 수 있습니다.",
    showWarrantyInfo: true,
    warrantyText:
      "본 제품은 구매일로부터 1년간 무상 A/S가 제공됩니다. 보증서 등록 후 A/S 신청이 가능합니다.",
    companyName: "썬데이허그",
    companyPhone: "02-123-4567",
    companyEmail: "cs@sundayhug.com",
  };

  const mergedSettings = { ...defaultSettings, ...settings };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{mergedSettings.companyName}</Text>
            <Text style={styles.subtitle}>주문확인서 / Order Confirmation</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={{ fontSize: 9, color: "#666" }}>주문번호</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: "#1e40af" }}>
              {order.orderNo}
            </Text>
          </View>
        </View>

        {/* 주문 정보 */}
        <View style={styles.orderInfo}>
          <View style={styles.orderInfoBox}>
            <Text style={styles.infoTitle}>주문 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>주문일</Text>
              <Text style={styles.infoValue}>{formatDate(order.ordTime)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>주문자</Text>
              <Text style={styles.infoValue}>{order.toName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>연락처</Text>
              <Text style={styles.infoValue}>{order.toHtel || order.toTel || "-"}</Text>
            </View>
          </View>
          <View style={[styles.orderInfoBox, styles.orderInfoBoxLast]}>
            <Text style={styles.infoTitle}>배송 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>수령인</Text>
              <Text style={styles.infoValue}>{order.toName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>주소</Text>
              <Text style={styles.infoValue}>
                {order.toAddr1} {order.toAddr2}
              </Text>
            </View>
          </View>
        </View>

        {/* 상품 목록 테이블 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>No.</Text>
            <Text style={styles.colProduct}>상품명</Text>
            <Text style={styles.colOption}>옵션</Text>
            <Text style={styles.colQty}>수량</Text>
            <Text style={styles.colPrice}>금액</Text>
          </View>

          {order.items.map((item, index) => (
            <View
              key={item.id}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colNo}>{index + 1}</Text>
              <Text style={styles.colProduct}>{item.saleName}</Text>
              <Text style={styles.colOption}>{item.optName || "-"}</Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.amt)}</Text>
            </View>
          ))}
        </View>

        {/* 합계 */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>총 결제금액</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
          </View>
        </View>

        {/* 사은품 공지 */}
        {mergedSettings.noticeText && (
          <View style={styles.noticeSection}>
            <Text style={styles.noticeTitle}>{mergedSettings.noticeTitle}</Text>
            <Text style={styles.noticeText}>{mergedSettings.noticeText}</Text>
          </View>
        )}

        {/* QR 코드 섹션 */}
        {qrCodeDataUrl && (
          <View style={styles.qrSection}>
            <Image style={styles.qrCode} src={qrCodeDataUrl} />
            <View style={styles.qrTextSection}>
              <Text style={styles.qrTitle}>{mergedSettings.qrTitle}</Text>
              <Text style={styles.qrDescription}>{mergedSettings.qrDescription}</Text>
            </View>
          </View>
        )}

        {/* 보증 안내 */}
        {mergedSettings.showWarrantyInfo && (
          <View style={styles.warrantyInfo}>
            <Text style={styles.warrantyTitle}>보증 안내</Text>
            <Text style={styles.warrantyText}>{mergedSettings.warrantyText}</Text>
          </View>
        )}

        {/* 푸터 */}
        <Text style={styles.footer}>
          {mergedSettings.companyName} | Tel: {mergedSettings.companyPhone} | Email:{" "}
          {mergedSettings.companyEmail}
          {"\n"}
          본 주문확인서는 영수증을 대체하지 않습니다.
        </Text>
      </Page>
    </Document>
  );
}

export default PackingSlipDocument;
