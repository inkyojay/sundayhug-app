/**
 * Comprehensive Excel Export Function Verification
 *
 * GET /api/debug/test-excel-all-functions - 모든 Excel 함수 테스트
 *
 * 이 라우트는 다음을 검증합니다:
 * 1. generateExcel - 기본 Excel 파일 생성
 * 2. generateExcelFromObjects - 타입이 지정된 데이터로 Excel 생성
 * 3. generateMultiSheetExcel - 다중 시트 Excel 생성
 * 4. Korean characters - 인코딩 문제 없음
 * 5. createExcelResponse - 타임스탬프가 포함된 파일명
 * 6. Excel formatting helpers - 서식 적용 함수들
 */
import type { Route } from "./+types/test-excel-all-functions";
import {
  generateExcel,
  generateExcelFromObjects,
  generateMultiSheetExcel,
  createExcelResponse,
  type ExcelColumnDef,
  type ExcelSheetDef,
} from "~/lib";
import ExcelJS from "exceljs";

// 테스트용 타입 정의
interface TestProduct {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

interface TestOrder {
  orderNo: string;
  customerName: string;
  amount: number;
  date: string;
  status: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const testType = url.searchParams.get("type") || "all";

    // 테스트 데이터 준비
    const products: TestProduct[] = [
      { id: 1, name: "아기 모니터", price: 89000, category: "전자기기", inStock: true },
      { id: 2, name: "유아용 체온계", price: 35000, category: "의료기기", inStock: true },
      { id: 3, name: "수면 센서", price: 120000, category: "전자기기", inStock: false },
      { id: 4, name: "베이비 침대", price: 450000, category: "가구", inStock: true },
      { id: 5, name: "기저귀 가방", price: 55000, category: "액세서리", inStock: true },
    ];

    const orders: TestOrder[] = [
      { orderNo: "ORD-001", customerName: "김철수", amount: 150000, date: "2024-01-15", status: "배송완료" },
      { orderNo: "ORD-002", customerName: "이영희", amount: 89000, date: "2024-01-16", status: "배송중" },
      { orderNo: "ORD-003", customerName: "박민수", amount: 350000, date: "2024-01-17", status: "주문접수" },
    ];

    let buffer: Buffer;
    let filename: string;

    switch (testType) {
      // Test 1: generateExcel - 기본 Excel 파일 생성
      case "generateExcel": {
        const columns: ExcelColumnDef<TestProduct>[] = [
          { header: "상품 ID", accessor: "id", width: 12 },
          { header: "상품명", accessor: "name", width: 20 },
          { header: "가격", accessor: (row) => `₩${row.price.toLocaleString("ko-KR")}`, width: 15 },
          { header: "카테고리", accessor: "category", width: 15 },
          { header: "재고", accessor: (row) => row.inStock ? "있음" : "없음", width: 10 },
        ];

        buffer = await generateExcel(columns, products, "상품 목록");
        filename = "test-generateExcel";
        break;
      }

      // Test 2: generateExcelFromObjects - 타입이 지정된 데이터로 생성
      case "generateExcelFromObjects": {
        const columns: ExcelColumnDef<TestOrder>[] = [
          { header: "주문번호", accessor: "orderNo", width: 15 },
          { header: "고객명", accessor: "customerName", width: 15 },
          { header: "금액", accessor: (row) => `₩${row.amount.toLocaleString("ko-KR")}`, width: 15 },
          { header: "주문일", accessor: "date", width: 15 },
          { header: "상태", accessor: "status", width: 12 },
        ];

        buffer = await generateExcelFromObjects(columns, orders, "주문 내역");
        filename = "test-generateExcelFromObjects";
        break;
      }

      // Test 3: Multi-sheet - 다중 시트 생성
      case "multiSheet": {
        const sheets: ExcelSheetDef<any>[] = [
          {
            sheetName: "상품 목록",
            columns: [
              { header: "상품 ID", accessor: "id", width: 12 },
              { header: "상품명", accessor: "name", width: 20 },
              { header: "가격", accessor: (row) => `₩${row.price.toLocaleString("ko-KR")}`, width: 15 },
              { header: "카테고리", accessor: "category", width: 15 },
            ],
            data: products,
          },
          {
            sheetName: "주문 내역",
            columns: [
              { header: "주문번호", accessor: "orderNo", width: 15 },
              { header: "고객명", accessor: "customerName", width: 15 },
              { header: "금액", accessor: (row) => `₩${row.amount.toLocaleString("ko-KR")}`, width: 15 },
              { header: "상태", accessor: "status", width: 12 },
            ],
            data: orders,
          },
        ];

        buffer = await generateMultiSheetExcel(sheets);
        filename = "test-multiSheet";
        break;
      }

      // Test 4: Korean characters - 한글 인코딩 테스트
      case "korean": {
        const koreanData = [
          { text: "안녕하세요", number: 12345, special: "₩", emoji: "😊" },
          { text: "한글 테스트", number: 67890, special: "€", emoji: "🎉" },
          { text: "가나다라마바사", number: 11111, special: "$", emoji: "🔥" },
          { text: "ABCDEFG123", number: 22222, special: "¥", emoji: "✨" },
        ];

        const columns: ExcelColumnDef<typeof koreanData[0]>[] = [
          { header: "텍스트", accessor: "text", width: 20 },
          { header: "숫자", accessor: "number", width: 15 },
          { header: "특수문자", accessor: "special", width: 12 },
          { header: "이모지", accessor: "emoji", width: 10 },
        ];

        buffer = await generateExcel(columns, koreanData, "한글 테스트");
        filename = "test-korean-encoding";
        break;
      }

      // Test 5: Advanced formatting - 고급 서식 테스트
      case "formatting": {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("서식 테스트");

        // 헤더 추가
        worksheet.columns = [
          { header: "카테고리", key: "category", width: 20 },
          { header: "값", key: "value", width: 15 },
          { header: "백분율", key: "percentage", width: 15 },
          { header: "날짜", key: "date", width: 15 },
        ];

        // 헤더 스타일
        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

        // 데이터 추가
        const data = [
          { category: "매출", value: 1000000, percentage: 0.15, date: new Date() },
          { category: "비용", value: 500000, percentage: 0.08, date: new Date() },
          { category: "순이익", value: 500000, percentage: 0.07, date: new Date() },
        ];

        data.forEach((row, idx) => {
          const excelRow = worksheet.addRow([
            row.category,
            row.value,
            row.percentage,
            row.date,
          ]);

          // 통화 형식
          excelRow.getCell(2).numFmt = "₩#,##0";
          // 백분율 형식
          excelRow.getCell(3).numFmt = "0.00%";
          // 날짜 형식
          excelRow.getCell(4).numFmt = "yyyy-mm-dd";

          // 조건부 서식 (매출이 높으면 초록색)
          if (row.value >= 700000) {
            excelRow.getCell(2).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF90EE90" },
            };
          }
        });

        // 테두리 추가
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        buffer = Buffer.from(arrayBuffer);
        filename = "test-formatting";
        break;
      }

      // Default: All tests combined
      default: {
        const sheets: ExcelSheetDef<any>[] = [
          // Sheet 1: 기본 함수 테스트
          {
            sheetName: "1. 기본 생성",
            columns: [
              { header: "상품명", accessor: "name", width: 20 },
              { header: "가격", accessor: (row) => `₩${row.price.toLocaleString("ko-KR")}`, width: 15 },
              { header: "카테고리", accessor: "category", width: 15 },
            ],
            data: products,
          },
          // Sheet 2: 타입 지정 데이터
          {
            sheetName: "2. 타입 지정",
            columns: [
              { header: "주문번호", accessor: "orderNo", width: 15 },
              { header: "고객명", accessor: "customerName", width: 15 },
              { header: "금액", accessor: (row) => `₩${row.amount.toLocaleString("ko-KR")}`, width: 15 },
            ],
            data: orders,
          },
          // Sheet 3: 한글 테스트
          {
            sheetName: "3. 한글 인코딩",
            columns: [
              { header: "테스트 항목", accessor: (row: any) => row, width: 30 },
            ],
            data: [
              "안녕하세요",
              "한글 인코딩 테스트",
              "특수문자: ₩€$¥",
              "이모지: 😊🎉🔥✨",
              "가나다라마바사아자차카타파하",
            ].map(text => ({ text })).map(obj => obj.text),
          },
        ];

        buffer = await generateMultiSheetExcel(sheets);
        filename = "test-all-excel-functions";
        break;
      }
    }

    // Excel Response 반환 (타임스탬프 자동 포함)
    return createExcelResponse(buffer, filename);
  } catch (error) {
    console.error("Excel function test error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
