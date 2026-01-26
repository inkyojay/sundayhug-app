/**
 * Test Excel Export Route
 *
 * GET /api/debug/test-excel-export - Excel 내보내기 테스트
 *
 * 한글 문자, 숫자, 날짜, 다중 시트 및 서식 적용을 검증하기 위한 테스트 라우트
 */
import type { Route } from "./+types/test-excel-export";
import {
  generateMultiSheetExcel,
  createExcelResponse,
  type ExcelSheetDef,
} from "~/lib";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // 테스트 데이터 1: 주문 목록 (한글 포함)
    const orders = [
      {
        orderNo: "ORD-2024-001",
        product: "아기 모니터",
        quantity: 2,
        amount: 150000,
        status: "배송완료",
        date: "2024-01-15"
      },
      {
        orderNo: "ORD-2024-002",
        product: "수면 센서",
        quantity: 1,
        amount: 89000,
        status: "배송중",
        date: "2024-01-20"
      },
      {
        orderNo: "ORD-2024-003",
        product: "아기 침대",
        quantity: 1,
        amount: 350000,
        status: "주문접수",
        date: "2024-01-25"
      },
      {
        orderNo: "ORD-2024-004",
        product: "스마트 체온계",
        quantity: 3,
        amount: 120000,
        status: "배송완료",
        date: "2024-01-18"
      },
    ];

    // 테스트 데이터 2: 고객 목록
    const customers = [
      {
        name: "김철수",
        email: "kim@example.com",
        phone: "010-1234-5678",
        city: "서울특별시",
        totalOrders: 5
      },
      {
        name: "이영희",
        email: "lee@example.com",
        phone: "010-2345-6789",
        city: "부산광역시",
        totalOrders: 3
      },
      {
        name: "박민수",
        email: "park@example.com",
        phone: "010-3456-7890",
        city: "인천광역시",
        totalOrders: 7
      },
      {
        name: "정수연",
        email: "jung@example.com",
        phone: "010-4567-8901",
        city: "대전광역시",
        totalOrders: 2
      },
    ];

    // 테스트 데이터 3: 통계 데이터
    const statistics = [
      {
        category: "총 주문 수",
        value: 156,
        change: "+12%",
        period: "2024-01"
      },
      {
        category: "총 매출액",
        value: 45000000,
        change: "+18%",
        period: "2024-01"
      },
      {
        category: "신규 고객",
        value: 34,
        change: "+5%",
        period: "2024-01"
      },
      {
        category: "평균 주문액",
        value: 288461,
        change: "+3%",
        period: "2024-01"
      },
    ];

    // 다중 시트 Excel 정의
    const sheets: ExcelSheetDef<any>[] = [
      {
        sheetName: "주문 목록",
        columns: [
          { header: "주문번호", accessor: "orderNo", width: 18 },
          { header: "상품명", accessor: "product", width: 20 },
          { header: "수량", accessor: "quantity", width: 10 },
          {
            header: "금액",
            accessor: (row) => `₩${row.amount.toLocaleString("ko-KR")}`,
            width: 15
          },
          { header: "상태", accessor: "status", width: 12 },
          { header: "주문일", accessor: "date", width: 15 },
        ],
        data: orders,
      },
      {
        sheetName: "고객 목록",
        columns: [
          { header: "이름", accessor: "name", width: 15 },
          { header: "이메일", accessor: "email", width: 25 },
          { header: "연락처", accessor: "phone", width: 18 },
          { header: "지역", accessor: "city", width: 15 },
          {
            header: "총 주문",
            accessor: (row) => `${row.totalOrders}회`,
            width: 12
          },
        ],
        data: customers,
      },
      {
        sheetName: "통계",
        columns: [
          { header: "카테고리", accessor: "category", width: 18 },
          {
            header: "값",
            accessor: (row) =>
              row.category.includes("금액")
                ? `₩${row.value.toLocaleString("ko-KR")}`
                : row.value.toLocaleString("ko-KR"),
            width: 18
          },
          { header: "변화율", accessor: "change", width: 12 },
          { header: "기간", accessor: "period", width: 12 },
        ],
        data: statistics,
      },
    ];

    // Excel 파일 생성
    const buffer = await generateMultiSheetExcel(sheets);

    // Excel Response 반환
    return createExcelResponse(buffer, "test-excel-export");
  } catch (error) {
    console.error("Excel export test error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
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
