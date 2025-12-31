/**
 * Packing List (패킹리스트) PDF 템플릿
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
    borderBottomColor: "#2c5282",
    paddingBottom: 15,
  },
  titleSection: {},
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c5282",
  },
  docInfo: {
    marginTop: 8,
  },
  docRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  docLabel: {
    width: 80,
    color: "#666",
    fontSize: 8,
  },
  docValue: {
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
    marginBottom: 15,
  },
  addressBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#ebf8ff",
    marginRight: 10,
  },
  addressBoxLast: {
    marginRight: 0,
  },
  addressTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#2c5282",
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  shipmentInfo: {
    flexDirection: "row",
    marginBottom: 15,
    backgroundColor: "#f0fff4",
    padding: 10,
  },
  shipmentCol: {
    flex: 1,
  },
  shipmentTitle: {
    fontWeight: "bold",
    fontSize: 8,
    marginBottom: 3,
    color: "#276749",
  },
  shipmentValue: {
    fontSize: 8,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2c5282",
    color: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 5,
    fontWeight: "bold",
    fontSize: 7,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 7,
    paddingHorizontal: 5,
    fontSize: 8,
  },
  tableRowAlt: {
    backgroundColor: "#f7fafc",
  },
  colBox: { width: "6%", textAlign: "center" },
  colSku: { width: "14%" },
  colDesc: { width: "26%" },
  colColor: { width: "12%" },
  colSize: { width: "8%", textAlign: "center" },
  colQty: { width: "8%", textAlign: "center" },
  colWeight: { width: "10%", textAlign: "right" },
  colDimension: { width: "16%", textAlign: "center" },
  boxSummary: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#d6bcfa",
  },
  boxSummaryTitle: {
    fontWeight: "bold",
    fontSize: 10,
    marginBottom: 8,
    color: "#553c9a",
  },
  boxSummaryRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  boxSummaryLabel: {
    width: 120,
    fontSize: 8,
    color: "#666",
  },
  boxSummaryValue: {
    fontSize: 8,
    fontWeight: "bold",
  },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  totalsBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f0f4f8",
    marginRight: 10,
  },
  totalsBoxLast: {
    marginRight: 0,
    backgroundColor: "#2c5282",
    color: "#ffffff",
  },
  totalsTitle: {
    fontWeight: "bold",
    fontSize: 8,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  totalsValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  remarksSection: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  remarksTitle: {
    fontWeight: "bold",
    fontSize: 9,
    marginBottom: 5,
  },
  remarksText: {
    fontSize: 8,
    color: "#666",
    lineHeight: 1.4,
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

interface PackingListProps {
  order: {
    order_number: string;
    order_date: string;
    shipping_address_en?: string | null;
  };
  shipment: {
    shipment_number: string;
    planned_date?: string | null;
    shipped_date?: string | null;
    carrier_name?: string | null;
    tracking_number?: string | null;
    shipping_method?: string | null;
    notes?: string | null;
  };
  customer: {
    company_name: string;
    company_name_en?: string | null;
    contact_name?: string | null;
    address_en?: string | null;
  };
  items: Array<{
    sku: string;
    product_name: string;
    color?: string | null;
    size?: string | null;
    quantity: number;
    box_number?: number | null;
  }>;
  company?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export function PackingListDocument({
  order,
  shipment,
  customer,
  items,
  company,
}: PackingListProps) {
  const defaultCompany = {
    name: "Sundayhug Co., Ltd.",
    address: "Seoul, South Korea",
    phone: "+82-2-1234-5678",
    email: "export@sundayhug.com",
  };

  const companyInfo = company || defaultCompany;

  // 박스별 그룹화
  const boxNumbers = Array.from(new Set(items.map((item) => item.box_number || 1))).sort();
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalBoxes = boxNumbers.length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>PACKING LIST</Text>
            <View style={styles.docInfo}>
              <View style={styles.docRow}>
                <Text style={styles.docLabel}>Shipment No:</Text>
                <Text style={styles.docValue}>{shipment.shipment_number}</Text>
              </View>
              <View style={styles.docRow}>
                <Text style={styles.docLabel}>Order Ref:</Text>
                <Text style={styles.docValue}>{order.order_number}</Text>
              </View>
              <View style={styles.docRow}>
                <Text style={styles.docLabel}>Date:</Text>
                <Text style={styles.docValue}>{formatDate(shipment.shipped_date || order.order_date)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text>{companyInfo.address}</Text>
            <Text>Tel: {companyInfo.phone}</Text>
          </View>
        </View>

        {/* 주소 정보 */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>Shipper</Text>
            <Text style={styles.addressText}>
              {companyInfo.name}
              {"\n"}
              {companyInfo.address}
            </Text>
          </View>
          <View style={[styles.addressBox, styles.addressBoxLast]}>
            <Text style={styles.addressTitle}>Consignee</Text>
            <Text style={styles.addressText}>
              {customer.company_name_en || customer.company_name}
              {customer.contact_name && `\nAttn: ${customer.contact_name}`}
              {"\n"}
              {order.shipping_address_en || customer.address_en || ""}
            </Text>
          </View>
        </View>

        {/* 배송 정보 */}
        <View style={styles.shipmentInfo}>
          <View style={styles.shipmentCol}>
            <Text style={styles.shipmentTitle}>Carrier</Text>
            <Text style={styles.shipmentValue}>{shipment.carrier_name || "-"}</Text>
          </View>
          <View style={styles.shipmentCol}>
            <Text style={styles.shipmentTitle}>Tracking No</Text>
            <Text style={styles.shipmentValue}>{shipment.tracking_number || "-"}</Text>
          </View>
          <View style={styles.shipmentCol}>
            <Text style={styles.shipmentTitle}>Ship Method</Text>
            <Text style={styles.shipmentValue}>{shipment.shipping_method || "-"}</Text>
          </View>
          <View style={styles.shipmentCol}>
            <Text style={styles.shipmentTitle}>Ship Date</Text>
            <Text style={styles.shipmentValue}>{formatDate(shipment.shipped_date)}</Text>
          </View>
        </View>

        {/* 품목 테이블 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colBox}>Box#</Text>
            <Text style={styles.colSku}>SKU</Text>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colColor}>Color</Text>
            <Text style={styles.colSize}>Size</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colWeight}>N.W.</Text>
            <Text style={styles.colDimension}>Dimensions</Text>
          </View>

          {items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colBox}>{item.box_number || 1}</Text>
              <Text style={styles.colSku}>{item.sku}</Text>
              <Text style={styles.colDesc}>{item.product_name}</Text>
              <Text style={styles.colColor}>{item.color || "-"}</Text>
              <Text style={styles.colSize}>{item.size || "-"}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colWeight}>-</Text>
              <Text style={styles.colDimension}>-</Text>
            </View>
          ))}
        </View>

        {/* 박스별 요약 */}
        <View style={styles.boxSummary}>
          <Text style={styles.boxSummaryTitle}>BOX SUMMARY</Text>
          {boxNumbers.map((boxNum) => {
            const boxItems = items.filter((item) => (item.box_number || 1) === boxNum);
            const boxQty = boxItems.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <View key={boxNum} style={styles.boxSummaryRow}>
                <Text style={styles.boxSummaryLabel}>Box #{boxNum}</Text>
                <Text style={styles.boxSummaryValue}>
                  {boxItems.length} items, {boxQty} pcs
                </Text>
              </View>
            );
          })}
        </View>

        {/* 합계 */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <Text style={styles.totalsTitle}>Total Cartons</Text>
            <Text style={styles.totalsValue}>{totalBoxes}</Text>
          </View>
          <View style={styles.totalsBox}>
            <Text style={styles.totalsTitle}>Total Pieces</Text>
            <Text style={styles.totalsValue}>{totalQuantity}</Text>
          </View>
          <View style={styles.totalsBox}>
            <Text style={styles.totalsTitle}>Gross Weight</Text>
            <Text style={styles.totalsValue}>- KG</Text>
          </View>
          <View style={[styles.totalsBox, styles.totalsBoxLast]}>
            <Text style={[styles.totalsTitle, { color: "#ffffff" }]}>Net Weight</Text>
            <Text style={[styles.totalsValue, { color: "#ffffff" }]}>- KG</Text>
          </View>
        </View>

        {/* 비고 */}
        {shipment.notes && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksTitle}>REMARKS</Text>
            <Text style={styles.remarksText}>{shipment.notes}</Text>
          </View>
        )}

        {/* 푸터 */}
        <Text style={styles.footer}>
          This packing list is for shipping reference only. Please check contents upon receipt.
        </Text>
      </Page>
    </Document>
  );
}

export default PackingListDocument;
