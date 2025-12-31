/**
 * Commercial Invoice (상업 송장) PDF 템플릿
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

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
    fontSize: 9,
    padding: 35,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: "#1a365d",
    paddingBottom: 15,
  },
  titleSection: {},
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a365d",
  },
  invoiceInfo: {
    marginTop: 8,
  },
  invoiceRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  invoiceLabel: {
    width: 80,
    color: "#666",
    fontSize: 8,
  },
  invoiceValue: {
    fontWeight: "bold",
    fontSize: 8,
  },
  companyInfo: {
    textAlign: "right",
    fontSize: 8,
    color: "#444",
  },
  companyName: {
    fontWeight: "bold",
    fontSize: 11,
    marginBottom: 3,
  },
  addressSection: {
    flexDirection: "row",
    marginBottom: 20,
  },
  addressBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f8fafc",
    marginRight: 10,
  },
  addressBoxLast: {
    marginRight: 0,
  },
  addressTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1a365d",
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a365d",
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
    fontSize: 8,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  colNo: { width: "4%" },
  colSku: { width: "12%" },
  colDesc: { width: "28%" },
  colOrigin: { width: "8%", textAlign: "center" },
  colQty: { width: "8%", textAlign: "center" },
  colUnit: { width: "10%", textAlign: "right" },
  colAmount: { width: "15%", textAlign: "right" },
  colHsCode: { width: "15%", textAlign: "center" },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  declarationBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f0f4f8",
    marginRight: 20,
    fontSize: 7,
    lineHeight: 1.5,
  },
  summaryBox: {
    width: 220,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingHorizontal: 5,
  },
  summaryLabel: {
    color: "#666",
    fontSize: 8,
  },
  summaryValue: {
    fontWeight: "bold",
    fontSize: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    paddingHorizontal: 5,
    borderTopWidth: 2,
    borderTopColor: "#1a365d",
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  footerSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 10,
    marginTop: 40,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666",
  },
  termsSection: {
    marginTop: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 7,
  },
  termsTitle: {
    fontWeight: "bold",
    marginBottom: 5,
    fontSize: 8,
  },
  termsRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  termsLabel: {
    width: 100,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 35,
    right: 35,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
});

interface CommercialInvoiceProps {
  order: {
    order_number: string;
    order_date: string;
    commercial_invoice_no?: string | null;
    currency: string;
    subtotal: number;
    discount_amount: number;
    shipping_cost: number;
    tax_amount: number;
    total_amount: number;
    payment_terms?: string | null;
    shipping_address_en?: string | null;
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
    month: "short",
    day: "numeric",
  });
};

export function CommercialInvoiceDocument({
  order,
  customer,
  items,
  company,
}: CommercialInvoiceProps) {
  const defaultCompany = {
    name: "Sundayhug Co., Ltd.",
    address: "Seoul, South Korea",
    phone: "+82-2-1234-5678",
    email: "export@sundayhug.com",
  };

  const companyInfo = company || defaultCompany;
  const currency = order.currency || "USD";
  const invoiceNo = order.commercial_invoice_no || order.order_number;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>COMMERCIAL INVOICE</Text>
            <View style={styles.invoiceInfo}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Invoice No:</Text>
                <Text style={styles.invoiceValue}>{invoiceNo}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Date:</Text>
                <Text style={styles.invoiceValue}>{formatDate(order.order_date)}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Order Ref:</Text>
                <Text style={styles.invoiceValue}>{order.order_number}</Text>
              </View>
            </View>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text>{companyInfo.address}</Text>
            <Text>Tel: {companyInfo.phone}</Text>
            <Text>Email: {companyInfo.email}</Text>
          </View>
        </View>

        {/* 주소 정보 */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>Exporter / Seller</Text>
            <Text style={styles.addressText}>
              {companyInfo.name}
              {"\n"}
              {companyInfo.address}
              {"\n"}
              Tel: {companyInfo.phone}
            </Text>
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>Importer / Buyer</Text>
            <Text style={styles.addressText}>
              {customer.company_name_en || customer.company_name}
              {customer.contact_name && `\nAttn: ${customer.contact_name}`}
              {customer.address_en && `\n${customer.address_en}`}
            </Text>
          </View>
          <View style={[styles.addressBox, styles.addressBoxLast]}>
            <Text style={styles.addressTitle}>Ship To</Text>
            <Text style={styles.addressText}>
              {order.shipping_address_en || customer.address_en || "Same as Importer"}
            </Text>
          </View>
        </View>

        {/* 품목 테이블 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colSku}>Item Code</Text>
            <Text style={styles.colDesc}>Description of Goods</Text>
            <Text style={styles.colOrigin}>Origin</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit Price</Text>
            <Text style={styles.colAmount}>Amount</Text>
            <Text style={styles.colHsCode}>HS Code</Text>
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
              <Text style={styles.colOrigin}>KR</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{formatCurrency(item.unit_price, currency)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.line_total, currency)}</Text>
              <Text style={styles.colHsCode}>-</Text>
            </View>
          ))}
        </View>

        {/* 합계 및 선언문 */}
        <View style={styles.summaryContainer}>
          <View style={styles.declarationBox}>
            <Text style={{ fontWeight: "bold", marginBottom: 5 }}>DECLARATION</Text>
            <Text>
              We declare that this invoice shows the actual price of the goods described,
              that all particulars are true and correct, and that all goods originated in
              the Republic of Korea.
            </Text>
          </View>
          <View style={styles.summaryBox}>
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
                <Text style={styles.summaryLabel}>Freight</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(order.shipping_cost, currency)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Packages</Text>
              <Text style={styles.summaryValue}>-</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Quantity</Text>
              <Text style={styles.summaryValue}>{totalQuantity} PCS</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL ({currency})</Text>
              <Text style={styles.totalValue}>{formatCurrency(order.total_amount, currency)}</Text>
            </View>
          </View>
        </View>

        {/* 거래 조건 */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>SHIPPING & PAYMENT TERMS</Text>
          <View style={styles.termsRow}>
            <Text style={styles.termsLabel}>Incoterms:</Text>
            <Text>FOB Incheon, Korea</Text>
          </View>
          <View style={styles.termsRow}>
            <Text style={styles.termsLabel}>Payment Terms:</Text>
            <Text>{order.payment_terms || "T/T in advance"}</Text>
          </View>
          <View style={styles.termsRow}>
            <Text style={styles.termsLabel}>Country of Origin:</Text>
            <Text>Republic of Korea</Text>
          </View>
        </View>

        {/* 서명란 */}
        <View style={styles.footerSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Authorized Signature & Date</Text>
            <Text style={{ fontSize: 7, color: "#999", marginTop: 3 }}>{companyInfo.name}</Text>
          </View>
        </View>

        {/* 푸터 */}
        <Text style={styles.footer}>
          This is the original Commercial Invoice. Please retain for customs clearance purposes.
        </Text>
      </Page>
    </Document>
  );
}

export default CommercialInvoiceDocument;
