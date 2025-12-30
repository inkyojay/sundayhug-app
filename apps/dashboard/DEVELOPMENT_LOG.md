# 썬데이허그 관리자 대시보드 (Dashboard App) 개발 일지

## 프로젝트 정보
- **앱 이름**: @sundayhug/dashboard
- **도메인**: admin.sundayhug.com
- **Vercel 프로젝트**: sundayhug-dashboard
- **GitHub**: https://github.com/inkyojay/sundayhug-app (apps/dashboard)
- **Supabase**: JAYCORP 프로젝트 (ugzwgegkvxcczwiottej) - 고객 앱과 공유

---

## 2025-12-30 (월) - 발주/입고/재고이동/교환반품 관리 시스템

### 요약
- **기능**: SKU 기반 발주서 제작, 입고 관리, 창고간 재고 이동, 교환/반품/AS 관리
- **DB**: 13개 신규 테이블 생성
- **UI**: 6개 신규 페이지 추가

### DB 마이그레이션

| 테이블 | 용도 |
|--------|------|
| `factories` | 공장 마스터 (여러 공장에서 같은 제품 제조 가능) |
| `warehouses` | 창고 마스터 (자체 창고 + 3PL: 쿠팡, 네이버 등) |
| `inventory_locations` | 창고별 재고 현황 (SKU별 창고 재고) |
| `purchase_orders` | 발주서 헤더 (발주번호, 공장, 상태, 예상입고일) |
| `purchase_order_items` | 발주서 품목 (SKU, 수량, 단가) |
| `stock_receipts` | 입고 헤더 (입고번호, 창고, 발주서 연결) |
| `stock_receipt_items` | 입고 품목 (실제 입고 수량) |
| `stock_transfers` | 재고 이동 헤더 (출발/도착 창고) |
| `stock_transfer_items` | 재고 이동 품목 |
| `returns_exchanges` | 교환/반품/AS 헤더 |
| `return_exchange_items` | 교환/반품/AS 품목 |
| `manual_shipments` | 수동 출고 기록 |
| `manual_shipment_items` | 수동 출고 품목 |

### 신규 페이지

| 페이지 | URL | 기능 |
|--------|-----|------|
| 공장 관리 | `/dashboard/factories` | 공장 CRUD, 담당자 정보 |
| 창고 관리 | `/dashboard/warehouses` | 자체창고/3PL 관리, 재고 수량 표시 |
| 발주 관리 | `/dashboard/purchase-orders` | 발주서 작성/목록/상태관리/다운로드 |
| 입고 관리 | `/dashboard/stock-receipts` | 발주 연결 또는 직접 입고, 창고 재고 자동 업데이트 |
| 재고 이동 | `/dashboard/stock-transfers` | 창고간 이동, 출발/도착 재고 자동 동기화 |
| 교환/반품/AS | `/dashboard/returns` | 채널별 관리, 재입고 처리 |

### 발주 상태 흐름
```
draft → sent → in_production → shipping → received
(작성중)  (발주완료)  (제작중)      (배송중)   (입고완료)
```

### 교환/반품/AS 유형
- `exchange`: 교환
- `return`: 반품
- `repair`: 수리(AS)

### 채널 지원
- 카페24, 네이버, 쿠팡, 11번가, G마켓, 옥션, 기타

### 파일 구조
```
apps/dashboard/app/features/
├── factories/screens/factory-list.tsx
├── warehouses/screens/warehouse-list.tsx
├── purchase-orders/screens/
│   ├── purchase-order-list.tsx
│   └── purchase-order-form.tsx
├── stock-receipts/screens/stock-receipt-list.tsx
├── stock-transfers/screens/stock-transfer-list.tsx
├── returns/screens/returns-list.tsx
└── inventory/api/inventory-locations.tsx
```

### 사이드바 메뉴
```
📦 재고/물류
├── 공장 관리
├── 창고 관리
├── 발주 관리
├── 입고 관리
├── 재고 이동
└── 교환/반품/AS
```

---

## 2025-12-30 (월) - 네이버/카페24 제품 페이지 UI 개선

### 요약
- **기능**: 색상/사이즈 필터, 정렬, 옵션 유무 필터 추가
- **UI 개선**: 단일 옵션 제품 화살표 숨김, 색상/사이즈 컬럼 추가
- **버그 수정**: SelectItem 빈 문자열 에러, ColorBadge null 체크

### 네이버/카페24 제품 페이지 공통 기능

| 기능 | 설명 |
|------|------|
| **색상 필터** | SKU 매핑된 색상별 필터링 |
| **사이즈 필터** | SKU 매핑된 사이즈별 필터링 |
| **옵션 유무 필터** | 전체/다중 옵션/단일 상품 |
| **정렬** | 제품명, 색상, 사이즈, 가격, 재고 기준 정렬 |
| **단일 옵션 화살표 숨김** | 옵션 1개 이하면 아코디언 화살표 미표시 |
| **색상/사이즈 컬럼** | 메인 테이블에 색상/사이즈 정보 표시 |

### 정렬 옵션
```
최신순 / 제품명 ↑↓ / 색상 ↑↓ / 사이즈 ↑↓ / 가격 낮은순/높은순 / 재고 적은순/많은순
```

### ColorBadge 컴포넌트 개선
- `colorName` prop에 `null`/`undefined` 체크 추가
- `color` prop alias 추가 (호환성)
- 값이 없으면 `null` 반환 (에러 방지)

### 버그 수정

1. **SelectItem 빈 문자열 에러**
   - 원인: `<SelectItem value="">` 빈 문자열 허용 안됨
   - 해결: `"__none__"` 값으로 변경, 내부적으로 빈 문자열 변환

2. **availableColors/Sizes 빈 문자열**
   - 원인: DB에서 빈 문자열 색상/사이즈가 포함됨
   - 해결: `.filter((v) => v)` 추가하여 빈 값 제외

3. **internalProducts SKU 빈 값**
   - 원인: SKU가 없는 제품이 SelectItem에 포함
   - 해결: `.filter((p) => p.sku)` 추가

### 파일 변경
```
apps/dashboard/app/
├── features/
│   ├── products-naver/screens/
│   │   └── naver-products.tsx        # 필터/정렬/화살표숨김 추가
│   └── products-cafe24/screens/
│       └── cafe24-products.tsx       # 필터/정렬/화살표숨김 추가
└── core/components/ui/
    └── color-badge.tsx               # null 체크, color alias 추가
```

---

## 2025-12-30 (월) - 제품 관리 고급 기능 (정렬/그룹핑/일괄변경/CSV/원가/변경로그)

### 요약
- **기능**: 제품 목록 및 제품 분류 페이지에 고급 관리 기능 추가
- **UI 개선**: Airtable 스타일 테이블, 인라인 편집, 색상 팔레트 자동 적용

### DB 마이그레이션

1. **products 테이블**
   - `cost_price` (NUMERIC) - 제품 원가 컬럼 추가
   - `thumbnail_url` (TEXT) - 썸네일 URL 컬럼 추가

2. **parent_products 테이블**
   - `thumbnail_url` (TEXT) - 썸네일 URL 컬럼 추가

3. **product_change_logs 테이블** (신규)
   ```sql
   CREATE TABLE product_change_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     table_name VARCHAR(50) NOT NULL,      -- 'products' 또는 'parent_products'
     record_id UUID NOT NULL,
     field_name VARCHAR(100) NOT NULL,
     old_value TEXT,
     new_value TEXT,
     changed_by UUID REFERENCES auth.users(id),
     changed_at TIMESTAMPTZ DEFAULT NOW(),
     change_type VARCHAR(20) DEFAULT 'update'  -- 'update', 'create', 'delete', 'bulk_update'
   );
   ```

### 제품 목록 (`/dashboard/products`) 기능

| 기능 | 설명 |
|------|------|
| **정렬** | 제품명, SKU, 사이즈, 색상, 원가 컬럼 클릭 시 정렬 |
| **그룹핑** | 분류별, 색상별, 사이즈별, 카테고리별 그룹화 |
| **체크박스 일괄 변경** | 다중 선택 후 분류/색상/사이즈/원가/썸네일/상태 일괄 수정 |
| **인라인 편집** | 연필 아이콘 클릭 시 행 단위 편집 |
| **색상 자동 팔레트** | 색상명 분석하여 배경색 자동 지정 (50+ 색상 매핑) |
| **색상/사이즈 직접 입력** | 기존 옵션 선택 또는 새 값 직접 입력 |
| **원가 필드** | 제품별 원가 관리 |
| **변경 확인 알람** | 저장 전 확인 다이얼로그 |
| **변경 로그 기록** | 모든 변경사항 DB 기록 |
| **CSV 다운로드** | 현재 목록 CSV 내보내기 |
| **CSV 업로드 (Upsert)** | SKU 기준 업데이트/삽입 |
| **페이지당 개수 선택** | 50/100/500/1000개씩 보기 |

### 제품 분류 (`/dashboard/parent-products`) 기능

| 기능 | 설명 |
|------|------|
| **하위 제품 상세 표시** | 펼침 시 색상/사이즈/썸네일 카드로 표시 |
| **정렬** | SKU, 제품명, 카테고리 컬럼 클릭 시 정렬 |
| **그룹핑** | 카테고리별, 서브카테고리별 그룹화 |
| **체크박스 일괄 변경** | 다중 선택 후 카테고리/서브카테고리/썸네일/설명/상태 일괄 수정 |
| **인라인 편집** | 연필 아이콘 클릭 시 행 단위 편집 |
| **변경 확인 알람** | 저장 전 확인 다이얼로그 |
| **변경 로그 기록** | 모든 변경사항 DB 기록 |
| **CSV 다운로드** | 현재 목록 CSV 내보내기 |
| **CSV 업로드 (Upsert)** | Parent SKU 기준 업데이트/삽입 |

### 컬럼 순서 (제품 목록)
```
이미지 → 제품명 → SKU → 사이즈 → 색상 → 원가 → 분류 → 채널 → 상태 → 액션
```

### 색상 자동 팔레트 매핑 (예시)
| 색상명 | 배경색 |
|--------|--------|
| 어스브라운 | #6B4423 |
| 데일리크림 | #FFFDD0 |
| 네이비 | #000080 |
| 화이트 | #FFFFFF (테두리 추가) |

### 파일 변경
```
apps/dashboard/app/
├── features/
│   ├── products/screens/
│   │   └── products.tsx              # 제품 목록 (전면 개편)
│   └── parent-products/screens/
│       └── parent-products.tsx       # 제품 분류 (전면 개편)
└── core/components/ui/
    ├── alert-dialog.tsx              # 신규 - 확인 다이얼로그
    └── switch.tsx                    # 신규 - 토글 스위치
```

### 버그 수정
- 보증서 삭제 시 외래키 제약조건 오류 수정 (`review_submissions` 먼저 삭제)
- 대시보드 다크모드 제거 (항상 라이트 모드)

---

## 2025-12-29 (일) - 후기 이벤트 참여 폼 설정 기능

### 요약
- **기능**: 이벤트별 참여 폼 설정 (유입 경로 질문, 보증서 연동 표시 여부)
- **개선**: 관리자가 이벤트마다 다른 폼 항목을 설정 가능

### 작업 내용

1. **DB 마이그레이션**
   - `review_events` 테이블에 3개 컬럼 추가:
     - `show_referral_source` (BOOLEAN) - 유입 경로 질문 표시 여부
     - `show_warranty_link` (BOOLEAN) - 보증서 연동 섹션 표시 여부
     - `referral_source_options` (JSONB) - 유입 경로 보기 항목 배열

2. **관리자 이벤트 폼 개선 (event-form.tsx)**
   - "참여 폼 설정" 섹션 추가
   - 유입 경로 질문 ON/OFF 체크박스
   - 유입 경로 보기 항목 관리 (추가/삭제/순서 변경)
   - 보증서 연동 섹션 ON/OFF 체크박스

3. **파일 변경**
   ```
   apps/dashboard/app/features/review/screens/admin/
   ├── event-form.tsx       # 참여 폼 설정 UI 추가
   ├── event-list.tsx       # 참여자 관리 링크 항상 표시
   └── event-submissions.tsx # profiles 조인 제거 (FK 없음 문제 해결)
   ```

### 기본 유입 경로 옵션
```json
["네이버 검색", "인스타그램 광고", "맘카페 내 추천", "주변 지인 추천", "기타"]
```

---

## 2025-12-29 (일) - 네이버 스마트스토어 제품 동기화 완성

### 요약
- **기능**: 네이버 스마트스토어 제품 및 옵션 동기화 구현 완료
- **최적화**: 504 Gateway Timeout 해결 (병렬 처리 + 배치 저장)

### 작업 내용

1. **제품 동기화 2단계 구현**
   - **1단계**: 상품 목록 조회 (`POST /external/v1/products/search`)
     - 기본 상품 정보 (이름, 가격, 재고, 판매자상품코드 등)
     - 페이지네이션 처리 (100개씩)
   - **2단계**: 원상품 상세 조회 (`GET /external/v2/products/origin-products/{originProductNo}`)
     - 옵션 정보 추출 (`detailAttribute.optionInfo.optionCombinations`)
     - 옵션별 재고, 가격, 판매자관리코드 저장

2. **디버깅 및 수정**
   - **API 응답 구조 수정**: 응답이 `{groupProduct, originProduct}` 형태인데 전체를 originProduct로 잘못 사용 → `response.originProduct`에서 추출하도록 수정
   - **option_name3/4 컬럼 오류**: 테이블에 없는 컬럼 저장 시도 제거

3. **성능 최적화 (504 Timeout 해결)**
   - **병렬 처리**: 원상품 상세 조회를 순차 → **5개씩 병렬** 처리
   - **배치 저장**: 개별 upsert → **배치 upsert** (제품 100개씩, 옵션 50개씩)
   - **효과**: 160개 상품 동기화 시 160초+ → ~30초 수준으로 개선

### DB 테이블
```sql
-- 네이버 제품 테이블 (이전에 생성됨)
CREATE TABLE naver_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_product_no BIGINT NOT NULL UNIQUE,
  channel_product_no BIGINT,
  product_name TEXT NOT NULL,
  seller_management_code TEXT,  -- 판매자 상품코드 (SKU 매핑용)
  sale_price NUMERIC,
  stock_quantity INTEGER,
  product_status TEXT,
  channel_product_display_status TEXT,
  status_type TEXT,
  sale_start_date TIMESTAMPTZ,
  sale_end_date TIMESTAMPTZ,
  represent_image TEXT,
  category_id TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 네이버 제품 옵션 테이블
CREATE TABLE naver_product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_product_no BIGINT NOT NULL,
  option_combination_id BIGINT NOT NULL,
  option_name1 TEXT,
  option_value1 TEXT,
  option_name2 TEXT,
  option_value2 TEXT,
  stock_quantity INTEGER,
  price NUMERIC,
  seller_management_code TEXT,  -- 옵션별 판매자관리코드
  use_yn TEXT DEFAULT 'Y',
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(origin_product_no, option_combination_id)
);
```

### 변경 파일
```
apps/dashboard/app/features/
├── integrations/
│   ├── api/
│   │   └── naver-sync-products.tsx   # 제품 동기화 (병렬+배치 최적화)
│   └── lib/
│       └── naver.server.ts           # getProductListDetailed, getOriginProduct 추가
├── products-naver/
│   └── screens/
│       └── naver-products.tsx        # 스마트스토어 제품 UI
└── users/components/
    └── dashboard-sidebar.tsx         # "스마트스토어 제품" 메뉴 추가
```

### API 엔드포인트
| 용도 | 메서드 | 엔드포인트 |
|------|--------|-----------|
| 상품 목록 조회 | POST | `/external/v1/products/search` |
| 원상품 상세 조회 | GET | `/external/v2/products/origin-products/{originProductNo}` |
| 옵션 재고 변경 | PUT | `/external/v1/products/origin-products/{originProductNo}/option-stock` |

### 트러블슈팅
- **`option_name3` 컬럼 없음 에러**: 테이블에 없는 컬럼 저장 시도 → 코드에서 해당 필드 제외
- **API 응답 구조 불일치**: `detailResult.product`가 전체 응답(`{groupProduct, originProduct}`)인데 바로 사용 → `response.originProduct` 추출 후 사용
- **504 Gateway Timeout**: Vercel 서버리스 60초 제한 초과 → 병렬 처리 + 배치 저장으로 해결

---

## 2025-12-23 (월) - 네이버 스마트스토어 API 연동

### 작업 내용

1. **네이버 커머스 API 연동 구현**
   - `/dashboard/integrations/naver` - 연동 상태 페이지
   - 토큰 발급/갱신 로직 (Client Credentials 방식)
   - 주문 동기화 기능
   - 상품 동기화 기능 (준비중)

2. **Railway 프록시 서버 구축**
   - Vercel의 동적 IP 문제 해결을 위해 Railway에 프록시 서버 배포
   - 고정 Outbound IP (`208.77.246.15`) 제공
   - bcrypt 기반 서명 생성 (네이버 API 요구사항)
   - `/my-ip` 엔드포인트로 실제 외부 IP 확인 가능

3. **네이버 API 인증 구현**
   - `type=SELF` (내 쇼핑몰 전용)
   - `account_id` 필수 파라미터 처리
   - 토큰 자동 갱신 로직

### 환경변수 (Vercel)
```
NAVER_CLIENT_ID=발급받은 클라이언트 ID
NAVER_CLIENT_SECRET=발급받은 클라이언트 시크릿
NAVER_ACCOUNT_ID=ncp_1okmyk_01
NAVER_PROXY_URL=https://sundayhug-app-production.up.railway.app
NAVER_PROXY_API_KEY=sundayhug-proxy-2024
```

### 환경변수 (Railway 프록시)
```
NAVER_CLIENT_ID=발급받은 클라이언트 ID
NAVER_CLIENT_SECRET=발급받은 클라이언트 시크릿
NAVER_ACCOUNT_ID=ncp_1okmyk_01
PROXY_API_KEY=sundayhug-proxy-2024
```

### DB 마이그레이션
```sql
-- 네이버 토큰 테이블
CREATE TABLE naver_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_in INTEGER,
  scope TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  client_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 파일 변경
```
apps/dashboard/
├── app/
│   ├── features/integrations/
│   │   ├── api/
│   │   │   ├── naver-auth-start.tsx     # 연동 시작
│   │   │   ├── naver-disconnect.tsx     # 연동 해제
│   │   │   ├── naver-sync-orders.tsx    # 주문 동기화
│   │   │   └── naver-sync-products.tsx  # 상품 동기화
│   │   ├── lib/
│   │   │   └── naver.server.ts          # API 클라이언트
│   │   └── screens/
│   │       └── naver-status.tsx         # 연동 상태 페이지
│   └── routes.ts                        # 네이버 연동 라우트 추가

naver-proxy/                             # Railway 프록시 서버
├── index.js                             # Express 서버
├── package.json
├── package-lock.json
├── railway.json
├── README.md
└── .gitignore
```

### 네이버 커머스 API 센터 설정
1. 애플리케이션 생성 (내 쇼핑몰 전용)
2. IP 등록: `208.77.246.15` (Railway Static IP)
3. 필요 권한: 주문 조회, 상품 조회

### 트러블슈팅
- **`type` 에러**: `SELLER` → `SELF`로 변경 (내 쇼핑몰 전용)
- **IP 에러**: Railway Pro 플랜 업그레이드 후 Static IP 활성화
- **서명 에러**: HMAC-SHA256 → bcrypt로 변경

---

## 2025-12-24 (수) - 네이버 주문 동기화 안정화/성능 개선

### 요약
- **문제**: 네이버 주문 조회 API가 `from/to` 파라미터를 **ISO-8601(+09:00)** 형태로 요구하고, 또한 **from~to 최대 24시간 제한**이 있어 7일/30일 조회 시 400 오류/동기화 실패가 발생.
- **해결**: 날짜 정규화 + 24시간 윈도우 분할 조회 + DB 저장/고객 매칭 로직 배치화로 **성공/성능을 동시에 개선**.

### 해결 상세
1. **날짜 포맷 정규화**
   - UI에서 들어오는 `YYYY-MM-DD`를 네이버 요구 포맷으로 변환:
     - `from`: `YYYY-MM-DDT00:00:00.000+09:00`
     - `to`: `YYYY-MM-DDT23:59:59.999+09:00`

2. **API 제약 대응: from~to 최대 24시간**
   - 조회 기간을 **24시간 단위로 분할**해 순차 호출 후 결과를 합산.
   - 참고 문서: https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-product-orders-with-conditions-pay-order-seller

3. **응답 구조 매핑**
   - `data.contents[].content.order / content.productOrder` 구조를 파싱해 내부 `orders` 스키마에 맞게 매핑.

4. **성능 개선 (가장 큰 효과)**
   - 기존: 주문 1건당 `upsert + select + customer match + link` 반복 → 수십 초~수 분 소요
   - 개선:
     - 주문 저장: **batch upsert** (1회)
     - 고객 매칭/연결: 고객(이름+전화) 단위로 **집계 후 batch insert/update** + `orders.customer_id`는 **update-only**로 연결
   - 런타임 기준(예시): 78건 동기화 **~87초 → ~8~9초** 수준으로 개선

5. **NOT NULL 제약 관련 오류 수정**
   - `customers.phone` NOT NULL, `orders.sol_no` NOT NULL 등으로 인해 bulk 작업이 insert 경로로 떨어질 때 실패하던 케이스를 보완:
     - customers upsert에 `name/phone/normalized_phone` 포함
     - orders.customer_id 연결은 upsert 금지 → `update ... in(id)`로만 수행

### 변경 파일
```
apps/dashboard/app/features/integrations/lib/naver.server.ts
apps/dashboard/app/features/integrations/api/naver-sync-orders.tsx
apps/dashboard/app/features/customer-analytics/lib/customer-matcher.server.ts
naver-proxy/index.js
```

---

## 2025-12-22 (일) - 회원 관리 및 관리자 승인 시스템

### 작업 내용

1. **회원 관리 기능 추가**
   - `/dashboard/members` - 회원 목록 페이지
   - `/dashboard/members/:id` - 회원 상세 페이지
   - 회원 검색 (이름, 전화번호, 이메일)
   - 회원 삭제 기능 (관련 데이터 정리 포함)
   - 사이드바에 "회원 관리" 메뉴 추가

2. **최고관리자(super_admin) 역할 추가**
   - `user_role` enum에 `super_admin` 값 추가
   - 최고관리자: `inkyojay@naver.com`
   - 최고관리자만 다른 회원의 역할 변경 가능

3. **관리자 가입 승인 시스템**
   - `/register` - 가입 페이지 추가
   - `profiles` 테이블에 `approval_status` 컬럼 추가
     - `pending`: 승인 대기
     - `approved`: 승인됨
     - `rejected`: 거절됨
   - 가입 시 `approval_status = 'pending'`으로 설정
   - 승인되지 않은 사용자는 로그인 불가

4. **회원 승인 관리 UI**
   - 회원 목록에 승인 상태 필터 (전체/대기/승인/거절)
   - 승인 대기 회원 수 알림 배너
   - 빠른 승인/거절 버튼 (체크/경고 아이콘)
   - 회원 상세에서 역할 및 승인 상태 변경 (Select UI)

5. **회원 삭제 버그 수정**
   - 삭제 순서 변경: auth.users → 관련 데이터 → profiles
   - 에러 발생 시에도 성공으로 처리 (이미 삭제된 경우 등)

6. **후기 인증 페이지 UI 개선**
   - 전체 너비 사용 (max-w-full)
   - 헤더/필터 상단 고정 (sticky)
   - 2컬럼 그리드 레이아웃

### DB 마이그레이션
```sql
-- super_admin 역할 추가
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 가입 승인 상태 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));
```

### 파일 변경
```
apps/dashboard/
├── app/
│   ├── features/
│   │   ├── members/              # 신규
│   │   │   └── screens/
│   │   │       ├── member-list.tsx
│   │   │       └── member-detail.tsx
│   │   ├── auth/screens/
│   │   │   ├── login.tsx         # 가입 링크, 승인 체크 추가
│   │   │   └── register.tsx      # 신규
│   │   ├── review/screens/admin/
│   │   │   └── review-list.tsx   # UI 개선
│   │   └── users/
│   │       ├── components/
│   │       │   └── dashboard-sidebar.tsx  # 회원관리 메뉴 추가
│   │       └── layouts/
│   │           └── dashboard.layout.tsx   # super_admin 접근 허용
│   ├── core/layouts/
│   │   └── private.layout.tsx
│   └── routes.ts                 # /register, /dashboard/members 추가
```

---

## 2025-12-08 (월) - 모노레포 전환 및 배포

### 작업 내용
1. **모노레포 구조로 전환**
   - 기존 `supaplate-master` 통합 앱에서 고객/대시보드 분리
   - Turborepo 기반 모노레포 구조 채택
   - 공유 패키지: `@sundayhug/ui`, `@sundayhug/database`, `@sundayhug/shared`

2. **Vercel 배포 설정**
   - Framework Preset: **React Router** (중요!)
   - Output Directory: Override **끄기** (React Router SSR 자동 처리)
   - Root Directory: `apps/dashboard`
   - vercel.json 삭제 (자동 감지 사용)

3. **누락 패키지 추가**
   - `html2canvas` - 수면 분석 이미지 저장용

### 환경변수
```
SUPABASE_URL=https://ugzwgegkvxcczwiottej.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SITE_URL=https://admin.sundayhug.com
GEMINI_API_KEY=...
```

### 주요 기능
- 보증서 관리 (승인/반려)
- A/S 요청 관리
- 수면 분석 관리
- 블로그 포스트 관리
- AI 상담 지식베이스 관리
- 후기 인증 관리 (승인/선물 발송)
- 후기 이벤트 관리

### 파일 구조
```
apps/dashboard/
├── app/
│   ├── features/
│   │   ├── users/        # 관리자 계정/대시보드
│   │   ├── warranty/     # 보증서 관리
│   │   ├── sleep-analysis/  # 수면 분석 관리
│   │   ├── blog/         # 블로그 관리
│   │   ├── chat/         # AI 상담 지식 관리
│   │   ├── review/       # 후기 관리
│   │   ├── products/     # 상품 관리
│   │   ├── orders/       # 주문 관리
│   │   └── inventory/    # 재고 관리
│   ├── core/             # 공통 컴포넌트
│   └── routes.ts         # 대시보드 라우트
├── package.json
└── react-router.config.ts
```

---

## 배포 체크리스트
- [ ] Vercel Framework Preset: React Router
- [ ] Output Directory Override: OFF
- [ ] 환경변수 설정 완료
- [ ] 도메인 연결 (admin.sundayhug.com)

---

## 이전 기록
- 2025-12-07: 후기 인증 관리 대시보드 대폭 개선
- 2025-12-06: 다크모드 지원, 이벤트 후기 관리 기능


