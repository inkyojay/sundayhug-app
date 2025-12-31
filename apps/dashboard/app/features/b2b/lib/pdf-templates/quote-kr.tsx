/**
 * 국문 견적서 PDF 템플릿
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// 한글 폰트 등록 (Noto Sans KR 사용)
Font.register({
  family: "NotoSansKR",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.18/files/noto-sans-kr-korean-400-normal.woff",
      fontWeight: "normal",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.18/files/noto-sans-kr-korean-700-normal.woff",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  companyInfo: {
    textAlign: "right",
    fontSize: 9,
    color: "#666666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  infoLabel: {
    width: 80,
    fontWeight: "bold",
    color: "#666666",
  },
  infoValue: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 8,
    paddingHorizontal: 5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  colNo: { width: "5%" },
  colSku: { width: "15%" },
  colName: { width: "35%" },
  colQty: { width: "10%", textAlign: "right" },
  colPrice: { width: "15%", textAlign: "right" },
  colDiscount: { width: "8%", textAlign: "center" },
  colTotal: { width: "12%", textAlign: "right" },
  summarySection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 250,
    marginBottom: 5,
  },
  summaryLabel: {
    width: 100,
    textAlign: "right",
    paddingRight: 10,
    color: "#666666",
  },
  summaryValue: {
    width: 120,
    textAlign: "right",
    fontWeight: "bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 250,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#1a1a1a",
  },
  totalLabel: {
    width: 100,
    textAlign: "right",
    paddingRight: 10,
    fontSize: 14,
    fontWeight: "bold",
  },
  totalValue: {
    width: 120,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#999999",
  },
  notesSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#fafafa",
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  notesText: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.5,
  },
  validUntil: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#fff8e6",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ffe58f",
  },
  validUntilText: {
    fontSize: 9,
    color: "#d48806",
    textAlign: "center",
  },
});

interface QuoteKRProps {
  order: {
    order_number: string;
    order_date: string;
    quote_valid_until?: string | null;
    subtotal: number;
    discount_amount: number;
    shipping_cost: number;
    tax_amount: number;
    total_amount: number;
    payment_terms?: string | null;
    customer_notes?: string | null;
  };
  customer: {
    company_name: string;
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    address?: string | null;
  };
  items: Array<{
    parent_sku: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_rate: number;
    line_total: number;
  }>;
  company?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    registrationNo: string;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export function QuoteKRDocument({ order, customer, items, company }: QuoteKRProps) {
  const defaultCompany = {
    name: "썬데이허그",
    address: "서울시 강남구",
    phone: "02-1234-5678",
    email: "contact@sundayhug.com",
    registrationNo: "000-00-00000",
  };

  const companyInfo = company || defaultCompany;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>견 적 서</Text>
            <Text style={{ fontSize: 11, color: "#666666", marginTop: 5 }}>
              견적번호: {order.order_number}
            </Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={{ fontWeight: "bold", fontSize: 11 }}>{companyInfo.name}</Text>
            <Text>{companyInfo.address}</Text>
            <Text>Tel: {companyInfo.phone}</Text>
            <Text>Email: {companyInfo.email}</Text>
            <Text>사업자등록번호: {companyInfo.registrationNo}</Text>
          </View>
        </View>

        {/* 수신처 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수신처</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>회사명</Text>
            <Text style={styles.infoValue}>{customer.company_name} 귀하</Text>
          </View>
          {customer.contact_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>담당자</Text>
              <Text style={styles.infoValue}>{customer.contact_name}</Text>
            </View>
          )}
          {customer.contact_phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>연락처</Text>
              <Text style={styles.infoValue}>{customer.contact_phone}</Text>
            </View>
          )}
          {customer.contact_email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>이메일</Text>
              <Text style={styles.infoValue}>{customer.contact_email}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>견적일자</Text>
            <Text style={styles.infoValue}>{formatDate(order.order_date)}</Text>
          </View>
          {order.payment_terms && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>결제조건</Text>
              <Text style={styles.infoValue}>{order.payment_terms}</Text>
            </View>
          )}
        </View>

        {/* 견적 품목 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>견적 품목</Text>
          <View style={styles.table}>
            {/* 테이블 헤더 */}
            <View style={styles.tableHeader}>
              <Text style={styles.colNo}>No</Text>
              <Text style={styles.colSku}>품목코드</Text>
              <Text style={styles.colName}>제품명</Text>
              <Text style={styles.colQty}>수량</Text>
              <Text style={styles.colPrice}>단가</Text>
              <Text style={styles.colDiscount}>할인</Text>
              <Text style={styles.colTotal}>금액</Text>
            </View>

            {/* 테이블 바디 */}
            {items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colNo}>{index + 1}</Text>
                <Text style={styles.colSku}>{item.parent_sku}</Text>
                <Text style={styles.colName}>{item.product_name}</Text>
                <Text style={styles.colQty}>{item.quantity.toLocaleString()}</Text>
                <Text style={styles.colPrice}>{formatCurrency(item.unit_price)}</Text>
                <Text style={styles.colDiscount}>
                  {item.discount_rate > 0 ? `${item.discount_rate}%` : "-"}
                </Text>
                <Text style={styles.colTotal}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 금액 합계 */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>소계</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          {order.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>할인</Text>
              <Text style={styles.summaryValue}>-{formatCurrency(order.discount_amount)}</Text>
            </View>
          )}
          {order.shipping_cost > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>배송비</Text>
              <Text style={styles.summaryValue}>{formatCurrency(order.shipping_cost)}</Text>
            </View>
          )}
          {order.tax_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>부가세</Text>
              <Text style={styles.summaryValue}>{formatCurrency(order.tax_amount)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>총 견적액</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
          </View>
        </View>

        {/* 견적 유효기간 */}
        {order.quote_valid_until && (
          <View style={styles.validUntil}>
            <Text style={styles.validUntilText}>
              본 견적서는 {formatDate(order.quote_valid_until)}까지 유효합니다.
            </Text>
          </View>
        )}

        {/* 비고 */}
        {order.customer_notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>비고</Text>
            <Text style={styles.notesText}>{order.customer_notes}</Text>
          </View>
        )}

        {/* 푸터 */}
        <Text style={styles.footer}>
          본 견적서에 대한 문의사항은 {companyInfo.phone} 또는 {companyInfo.email}로 연락 바랍니다.
        </Text>
      </Page>
    </Document>
  );
}

export default QuoteKRDocument;
