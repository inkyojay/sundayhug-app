/**
 * Proforma Invoice (영문 견적서) PDF 템플릿
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// 영문 폰트
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica", fontWeight: "normal" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 10,
    color: "#666666",
    marginTop: 5,
  },
  companyInfo: {
    textAlign: "right",
    fontSize: 9,
    color: "#444444",
  },
  companyName: {
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 5,
  },
  twoColumns: {
    flexDirection: "row",
    marginBottom: 25,
  },
  column: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: 100,
    fontWeight: "bold",
    color: "#666666",
    fontSize: 9,
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2d3748",
    color: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: "#f7fafc",
  },
  colNo: { width: "5%" },
  colSku: { width: "15%" },
  colDesc: { width: "35%" },
  colQty: { width: "10%", textAlign: "center" },
  colPrice: { width: "15%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  summarySection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 280,
    marginBottom: 6,
    paddingRight: 8,
  },
  summaryLabel: {
    width: 140,
    textAlign: "right",
    paddingRight: 15,
    color: "#666666",
    fontSize: 9,
  },
  summaryValue: {
    width: 120,
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 9,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 280,
    marginTop: 8,
    paddingTop: 10,
    paddingRight: 8,
    borderTopWidth: 2,
    borderTopColor: "#2d3748",
  },
  totalLabel: {
    width: 140,
    textAlign: "right",
    paddingRight: 15,
    fontSize: 12,
    fontWeight: "bold",
  },
  totalValue: {
    width: 120,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "bold",
  },
  termsSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f7fafc",
    borderRadius: 4,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  termsRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  termsLabel: {
    width: 120,
    fontWeight: "bold",
    fontSize: 9,
    color: "#666666",
  },
  termsValue: {
    flex: 1,
    fontSize: 9,
  },
  bankInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#edf2f7",
    borderRadius: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  validBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#ed8936",
    borderRadius: 4,
  },
  validText: {
    fontSize: 9,
    color: "#c05621",
    textAlign: "center",
  },
});

interface ProformaInvoiceProps {
  order: {
    order_number: string;
    order_date: string;
    quote_valid_until?: string | null;
    currency: string;
    subtotal: number;
    discount_amount: number;
    shipping_cost: number;
    tax_amount: number;
    total_amount: number;
    payment_terms?: string | null;
    shipping_address_en?: string | null;
    customer_notes?: string | null;
  };
  customer: {
    company_name: string;
    company_name_en?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    address_en?: string | null;
    country_code?: string | null;
  };
  items: Array<{
    parent_sku: string;
    product_name: string;
    product_name_en?: string | null;
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
  };
}

const formatCurrency = (amount: number, currency: string = "USD") => {
  if (currency === "KRW") {
    return "₩" + new Intl.NumberFormat("en-US").format(amount);
  }
  return "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export function ProformaInvoiceDocument({
  order,
  customer,
  items,
  company,
}: ProformaInvoiceProps) {
  const defaultCompany = {
    name: "Sundayhug Co., Ltd.",
    address: "Seoul, South Korea",
    phone: "+82-2-1234-5678",
    email: "export@sundayhug.com",
  };

  const companyInfo = company || defaultCompany;
  const currency = order.currency || "USD";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>PROFORMA INVOICE</Text>
            <Text style={styles.subtitle}>Invoice No: {order.order_number}</Text>
            <Text style={styles.subtitle}>Date: {formatDate(order.order_date)}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text>{companyInfo.address}</Text>
            <Text>Tel: {companyInfo.phone}</Text>
            <Text>Email: {companyInfo.email}</Text>
          </View>
        </View>

        {/* 송수신처 정보 */}
        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
              {customer.company_name_en || customer.company_name}
            </Text>
            {customer.contact_name && <Text style={{ fontSize: 9 }}>Attn: {customer.contact_name}</Text>}
            {customer.address_en && (
              <Text style={{ fontSize: 9, marginTop: 5 }}>{customer.address_en}</Text>
            )}
            {customer.contact_email && (
              <Text style={{ fontSize: 9, marginTop: 3 }}>{customer.contact_email}</Text>
            )}
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            {order.shipping_address_en ? (
              <Text style={{ fontSize: 9 }}>{order.shipping_address_en}</Text>
            ) : customer.address_en ? (
              <Text style={{ fontSize: 9 }}>{customer.address_en}</Text>
            ) : (
              <Text style={{ fontSize: 9, color: "#999" }}>Same as billing address</Text>
            )}
          </View>
        </View>

        {/* 품목 테이블 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colSku}>Item Code</Text>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colNo}>{index + 1}</Text>
              <Text style={styles.colSku}>{item.parent_sku}</Text>
              <Text style={styles.colDesc}>
                {item.product_name_en || item.product_name}
              </Text>
              <Text style={styles.colQty}>{item.quantity.toLocaleString()}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unit_price, currency)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.line_total, currency)}</Text>
            </View>
          ))}
        </View>

        {/* 금액 합계 */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.subtotal, currency)}</Text>
          </View>
          {order.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>
                -{formatCurrency(order.discount_amount, currency)}
              </Text>
            </View>
          )}
          {order.shipping_cost > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping & Handling</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(order.shipping_cost, currency)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL ({currency})</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total_amount, currency)}</Text>
          </View>
        </View>

        {/* 거래조건 */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <View style={styles.termsRow}>
            <Text style={styles.termsLabel}>Payment Terms:</Text>
            <Text style={styles.termsValue}>{order.payment_terms || "T/T in advance"}</Text>
          </View>
          <View style={styles.termsRow}>
            <Text style={styles.termsLabel}>Incoterms:</Text>
            <Text style={styles.termsValue}>FOB Korea</Text>
          </View>
          <View style={styles.termsRow}>
            <Text style={styles.termsLabel}>Country of Origin:</Text>
            <Text style={styles.termsValue}>Republic of Korea</Text>
          </View>
        </View>

        {/* 견적 유효기간 */}
        {order.quote_valid_until && (
          <View style={styles.validBox}>
            <Text style={styles.validText}>
              This proforma invoice is valid until {formatDate(order.quote_valid_until)}.
            </Text>
          </View>
        )}

        {/* 푸터 */}
        <Text style={styles.footer}>
          This is a proforma invoice and not a demand for payment. Final commercial invoice will
          be issued upon order confirmation.
        </Text>
      </Page>
    </Document>
  );
}

export default ProformaInvoiceDocument;
