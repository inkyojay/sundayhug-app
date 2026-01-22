/**
 * 한진택배 송장 엑셀 내보내기
 *
 * 한진택배 운송장 양식에 맞는 엑셀 파일 생성
 */
import ExcelJS from "exceljs";
import type { UnifiedOrder } from "./orders-unified.shared";

/**
 * 한진택배 송장 엑셀 열 구조
 */
interface HanjinInvoiceRow {
  toName: string;          // 받으시는 분
  toTel: string;           // 받으시는 분 전화
  toHtel: string;          // 받는분핸드폰
  zipCode: string;         // 받는분우편번호
  fullAddress: string;     // 받는분총주소
  qty: number;             // 수량
  productName: string;     // 품목명
  memo: string;            // 메모1 (주문번호)
}

/**
 * 주소에서 우편번호 추출
 *
 * 한국 우편번호 형식: 5자리 숫자
 * 주소 앞뒤로 우편번호가 있을 수 있음
 */
function extractZipCode(address1: string, address2: string): string {
  const fullAddr = `${address1} ${address2}`;

  // 5자리 숫자 패턴 (우편번호)
  const zipMatch = fullAddr.match(/\b(\d{5})\b/);
  if (zipMatch) {
    return zipMatch[1];
  }

  // 구 우편번호 형식 (3자리-3자리)
  const oldZipMatch = fullAddr.match(/\b(\d{3}-\d{3})\b/);
  if (oldZipMatch) {
    return oldZipMatch[1];
  }

  return "";
}

/**
 * 품목명 생성
 *
 * 첫 번째 상품명 + "외 N건" 형식
 */
function buildProductName(order: UnifiedOrder): string {
  if (order.items.length === 0) {
    return "상품";
  }

  const firstItem = order.items[0];
  const baseName = firstItem.optName
    ? `${firstItem.saleName} (${firstItem.optName})`
    : firstItem.saleName;

  if (order.items.length === 1) {
    return baseName;
  }

  return `${baseName} 외 ${order.items.length - 1}건`;
}

/**
 * 주문 데이터를 한진택배 양식으로 변환
 */
function convertToHanjinFormat(order: UnifiedOrder): HanjinInvoiceRow {
  const fullAddress = `${order.toAddr1 || ""} ${order.toAddr2 || ""}`.trim();
  const zipCode = extractZipCode(order.toAddr1, order.toAddr2);

  return {
    toName: order.toName || "",
    toTel: order.toTel || "",
    toHtel: order.toHtel || "",
    zipCode,
    fullAddress,
    qty: order.totalQty,
    productName: buildProductName(order),
    memo: order.orderNo,
  };
}

/**
 * 한진택배 송장 엑셀 파일 생성 및 다운로드
 *
 * @param orders - 내보낼 주문 목록
 * @param filename - 파일명 (기본값: hanjin_invoice_YYYY-MM-DD.xlsx)
 */
export async function exportHanjinInvoiceExcel(
  orders: UnifiedOrder[],
  filename?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sundayhug Admin";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("한진택배 송장");

  // 열 정의
  worksheet.columns = [
    { header: "받으시는 분", key: "toName", width: 15 },
    { header: "받으시는 분 전화", key: "toTel", width: 15 },
    { header: "받는분핸드폰", key: "toHtel", width: 15 },
    { header: "받는분우편번호", key: "zipCode", width: 12 },
    { header: "받는분총주소", key: "fullAddress", width: 50 },
    { header: "수량", key: "qty", width: 8 },
    { header: "품목명", key: "productName", width: 40 },
    { header: "메모1", key: "memo", width: 20 },
  ];

  // 헤더 스타일
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // 데이터 추가
  for (const order of orders) {
    const row = convertToHanjinFormat(order);
    worksheet.addRow(row);
  }

  // 모든 데이터 행에 테두리 추가
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // 파일 생성 및 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `hanjin_invoice_${new Date().toISOString().split("T")[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
