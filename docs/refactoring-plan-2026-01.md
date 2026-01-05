# 대시보드 앱 리팩토링 계획서

## 현황 분석

### 피처 모듈 구조 현황 (31개 피처)

| 구조 타입 | 피처 목록 | 개수 |
|----------|----------|------|
| **완전한 구조** (api, lib, components, screens) | auth, blog, sleep-analysis, users | 4 |
| **부분 구조** (api/lib + screens) | b2b, chat, customer, integrations, inventory, settings, warranty | 7 |
| **최소 구조** (screens만) | factories, members, orders-direct, parent-products, payments, products, products-cafe24, products-naver, purchase-orders, returns, stock-receipts, stock-transfers, warehouses, contact, customer-analytics, legal, review | 17 |
| **기타** | cron (api만) | 1 |

### 발견된 문제점

1. **구조 불일치**: 피처마다 폴더 구조가 다름
2. **비즈니스 로직 분산**: screens 파일에 API 호출, 데이터 처리 로직 혼재
3. **코드 재사용 어려움**: 공통 로직이 각 피처에 중복
4. **병렬 작업 충돌**: 파일 경계가 불명확하여 동시 수정 시 충돌 위험
5. **테스트 어려움**: 비즈니스 로직이 UI와 결합되어 단위 테스트 곤란

---

## 표준 피처 구조 정의

```
features/{feature-name}/
├── api/              # Route actions/loaders (서버 사이드)
│   ├── {action}.tsx  # form action handlers
│   └── +types/       # 자동 생성 타입
├── lib/              # 비즈니스 로직 (순수 함수)
│   ├── {feature}.server.ts   # 서버 전용 (DB, 외부 API)
│   ├── {feature}.client.ts   # 클라이언트 전용
│   └── {feature}.shared.ts   # 공유 유틸리티
├── components/       # 재사용 UI 컴포넌트
│   ├── {Component}.tsx
│   └── index.ts      # barrel export
├── screens/          # 라우트 페이지 컴포넌트
│   └── {page}.tsx
├── hooks/            # 커스텀 훅 (선택)
│   └── use{Feature}.ts
└── types/            # 타입 정의 (선택)
    └── index.ts
```

### 파일 역할 정의

| 디렉토리 | 역할 | 병렬 작업 |
|---------|------|---------|
| `api/` | HTTP 요청 처리, form action | 독립적 |
| `lib/` | 비즈니스 로직, DB 쿼리 | 독립적 |
| `components/` | 재사용 UI 조각 | 독립적 |
| `screens/` | 페이지 레이아웃, 라우팅 | 의존적 |

---

## 리팩토링 단계

### Phase 1: 핵심 피처 구조화 (우선순위 High)

비즈니스 크리티컬한 피처부터 표준 구조로 정리

#### 1.1 재고 관리 (inventory)

**현재 구조:**
```
inventory/
├── api/
│   └── update-stock.tsx
└── screens/
    ├── inventory.tsx
    └── inventory-history.tsx
```

**목표 구조:**
```
inventory/
├── api/
│   ├── update-stock.tsx
│   ├── bulk-update.tsx
│   └── export.tsx
├── lib/
│   ├── inventory.server.ts    # DB 쿼리, 재고 계산
│   └── inventory.shared.ts    # 유틸리티 (수량 포맷 등)
├── components/
│   ├── InventoryTable.tsx
│   ├── StockBadge.tsx
│   └── WarehouseSelector.tsx
└── screens/
    ├── inventory.tsx
    └── inventory-history.tsx
```

**병렬 작업 가능:**
- A: lib/inventory.server.ts 작성
- B: components/InventoryTable.tsx 분리
- C: api/bulk-update.tsx 구현

#### 1.2 주문 관리 (orders-direct)

**현재 구조:**
```
orders-direct/
└── screens/
    └── order-list.tsx (500+ lines)
```

**목표 구조:**
```
orders-direct/
├── api/
│   ├── update-status.tsx
│   ├── bulk-action.tsx
│   └── export-excel.tsx
├── lib/
│   ├── orders.server.ts       # 주문 조회/수정 로직
│   └── orders.shared.ts       # 상태 매핑, 포맷
├── components/
│   ├── OrderTable.tsx
│   ├── OrderStatusBadge.tsx
│   ├── OrderFilters.tsx
│   └── OrderDetailSheet.tsx
└── screens/
    └── order-list.tsx
```

#### 1.3 쿠팡 연동 (integrations)

**현재 구조:** ✅ 이미 양호
```
integrations/
├── api/        # 잘 분리됨
├── lib/        # coupang.server.ts 존재
└── screens/
```

**개선점:**
- `lib/coupang.server.ts` 파일이 커짐 → 분할 필요
  - `lib/coupang-auth.server.ts`
  - `lib/coupang-products.server.ts`
  - `lib/coupang-inventory.server.ts`
  - `lib/coupang-orders.server.ts`

---

### Phase 2: 공통 모듈 추출

#### 2.1 공통 컴포넌트 (`@/components`)

screens에서 반복되는 UI 패턴 추출:

```typescript
// components/data-table/
DataTable.tsx           // 제네릭 테이블
DataTablePagination.tsx
DataTableFilters.tsx
DataTableExport.tsx

// components/forms/
FormField.tsx
SearchableSelect.tsx
DateRangePicker.tsx

// components/layout/
PageHeader.tsx
StatCard.tsx
TabsNav.tsx
```

#### 2.2 공통 훅 (`@/hooks`)

```typescript
// hooks/
useDataTable.ts       // 테이블 상태 관리 (정렬, 페이징, 필터)
useSearchParams.ts    // URL 파라미터 동기화
useConfirm.ts         // 확인 다이얼로그
useBulkAction.ts      // 대량 선택/처리
```

#### 2.3 공통 서버 유틸 (`@/lib`)

```typescript
// lib/
supabase.server.ts    // Supabase 클라이언트 (이미 있음)
pagination.server.ts  // 페이지네이션 헬퍼
export.server.ts      // Excel/CSV 내보내기
```

---

### Phase 3: 라우트 정리

#### 3.1 현재 라우트 문제점

```typescript
// routes.ts - 현재 (혼재됨)
route("dashboard/admin/users", ...),
route("dashboard/admin/signup-requests", ...),
route("dashboard/members", ...),  // admin 밖에 있음
```

#### 3.2 라우트 재구성 제안

```typescript
// 제안: 역할별 명확한 분리
/dashboard
├── /orders          # 주문 관리
├── /products        # 상품 관리
├── /inventory       # 재고 관리
├── /customers       # 고객 관리
├── /integrations    # 외부 연동
│   ├── /coupang
│   └── /cafe24
├── /reports         # 리포트/분석
└── /settings        # 설정
    ├── /account
    ├── /team        # (기존 admin/users)
    └── /billing
```

---

### Phase 4: 피처별 마이그레이션

각 피처를 표준 구조로 전환하는 세부 단계:

#### 마이그레이션 체크리스트

```markdown
[ ] 1. lib/ 디렉토리 생성
[ ] 2. screens에서 DB 쿼리 → lib/{feature}.server.ts로 이동
[ ] 3. screens에서 유틸 함수 → lib/{feature}.shared.ts로 이동
[ ] 4. 큰 컴포넌트 → components/로 분리
[ ] 5. form action → api/로 분리
[ ] 6. 타입 정의 → types/index.ts로 통합
[ ] 7. barrel export 추가 (components/index.ts)
```

#### 피처별 우선순위

| 순위 | 피처 | 이유 | 예상 작업량 |
|-----|------|------|-----------|
| 1 | orders-direct | 가장 복잡, 사용빈도 높음 | Large |
| 2 | products | 상품 관리 핵심 | Medium |
| 3 | inventory | 재고-주문 연동 | Medium |
| 4 | returns | 교환/반품 관리 | Small |
| 5 | purchase-orders | 발주 관리 | Small |
| 6 | warehouses | 창고 관리 | Small |
| 7 | customer | 고객 관리 | Medium |
| 8 | payments | 결제 관리 | Small |

---

## 병렬 작업 전략

### 작업 분할 원칙

```
팀원 A: lib/ 계층 (비즈니스 로직)
팀원 B: components/ 계층 (UI 컴포넌트)
팀원 C: api/ 계층 (서버 액션)
팀원 D: screens/ 계층 (페이지 조립)
```

### 의존성 순서

```
lib/ → components/ → screens/
       ↘           ↗
         api/
```

1. **lib/** 먼저 완성 (다른 계층의 기반)
2. **components/**, **api/** 병렬 진행
3. **screens/** 마지막 (조립 단계)

### Git 브랜치 전략

```
main
├── refactor/inventory-lib      # 재고 lib 분리
├── refactor/inventory-components  # 재고 컴포넌트 분리
├── refactor/orders-lib         # 주문 lib 분리
└── refactor/common-components  # 공통 컴포넌트
```

---

## 실행 계획

### Week 1: 공통 인프라

- [ ] 공통 컴포넌트 셸 생성 (DataTable, PageHeader 등)
- [ ] 공통 훅 생성 (useDataTable, useSearchParams)
- [ ] lib/pagination.server.ts 구현

### Week 2: 주문 관리 리팩토링

- [ ] orders-direct/lib/orders.server.ts 추출
- [ ] orders-direct/components/ 분리
- [ ] 통합 테스트

### Week 3: 상품/재고 리팩토링

- [ ] products/lib 추출
- [ ] inventory/lib 추출
- [ ] 공통 재고 컴포넌트

### Week 4: 나머지 피처

- [ ] returns, warehouses, purchase-orders
- [ ] 라우트 정리
- [ ] 문서화

---

## 마이그레이션 예시: orders-direct

### Before (현재)

```typescript
// screens/order-list.tsx (500+ lines)
export async function loader({ request }: Route.LoaderArgs) {
  // 1. URL 파싱 (50줄)
  // 2. Supabase 쿼리 (100줄)
  // 3. 데이터 변환 (50줄)
  return { orders, pagination, filters };
}

export default function OrderListPage() {
  // 4. 테이블 렌더링 (300줄)
  // 5. 필터 UI (100줄)
}
```

### After (목표)

```typescript
// lib/orders.server.ts
export async function getOrders(params: OrderQueryParams) { ... }
export async function updateOrderStatus(id: string, status: string) { ... }

// lib/orders.shared.ts
export const ORDER_STATUS_MAP = { ... };
export function formatOrderNumber(id: string) { ... }

// components/OrderTable.tsx
export function OrderTable({ orders, onStatusChange }) { ... }

// components/OrderFilters.tsx
export function OrderFilters({ filters, onChange }) { ... }

// screens/order-list.tsx (100줄 이하)
export async function loader({ request }) {
  const params = parseSearchParams(request);
  const { orders, total } = await getOrders(params);
  return { orders, total, params };
}

export default function OrderListPage() {
  const { orders } = useLoaderData();
  return (
    <PageHeader title="주문 관리" />
    <OrderFilters />
    <OrderTable orders={orders} />
  );
}
```

---

## 체크포인트

### Phase 1 완료 기준
- [ ] inventory, orders-direct lib/ 분리 완료
- [ ] 공통 컴포넌트 5개 이상 추출
- [ ] screens 파일 평균 200줄 이하

### Phase 2 완료 기준
- [ ] 모든 핵심 피처 표준 구조 적용
- [ ] 코드 중복 50% 감소
- [ ] 신규 피처 추가 템플릿 문서화

---

## 결론

이 리팩토링의 핵심 목표:

1. **관심사 분리**: UI ↔ 비즈니스 로직 ↔ 데이터 액세스
2. **병렬 작업 가능**: 계층별 독립적인 작업
3. **테스트 용이**: lib/ 계층 단위 테스트 가능
4. **일관성**: 모든 피처가 동일한 구조

피처 하나씩 점진적으로 마이그레이션하면서 진행하면, 기존 기능에 영향 없이 구조 개선이 가능합니다.
