# 🚀 쿠팡 로켓그로스 API 연동 계획

**상태**: ⏸️ 보류 (PlayAuto 대시보드 완성 후 진행)

---

## 📋 개요

PlayAuto 재고 관리 시스템 완성 후, 쿠팡 로켓그로스 API를 연동하여 주문 관리 및 재고 동기화 기능을 추가합니다.

---

## 🎯 주요 기능

### 1. 주문 관리
- 실시간 주문 현황 조회
- 주문 상세 정보
- 주문 상태별 필터링
- 미발송 주문 알림

### 2. 재고 동기화
- 로켓창고 재고 조회
- PlayAuto 재고 vs 쿠팡 재고 비교
- 재고 불일치 자동 감지 및 알림

### 3. 상품 관리
- 쿠팡 등록 상품 목록
- 상품 정보 조회
- 상품 상태 모니터링

### 4. 판매 분석
- 일별/주별/월별 판매 통계
- SKU별 판매 추이
- 베스트셀러 분석
- 재고 회전율

---

## 🗂️ 데이터베이스 설계 (예상)

### coupang_orders (주문 정보)
```sql
- id (uuid, PK)
- order_id (varchar, unique) -- 쿠팡 주문 번호
- order_date (timestamp)
- sku (varchar) -- products 테이블 참조
- product_name (varchar)
- quantity (integer)
- order_status (varchar) -- 주문상태
- shipping_status (varchar) -- 배송상태
- customer_name (varchar, encrypted)
- payment_amount (integer)
- created_at (timestamp)
- updated_at (timestamp)
```

### coupang_inventory (쿠팡 재고)
```sql
- id (uuid, PK)
- sku (varchar) -- products 테이블 참조
- coupang_stock (integer) -- 쿠팡 재고
- playauto_stock (integer) -- PlayAuto 재고
- stock_difference (integer) -- 재고 차이
- sync_status (varchar) -- 동기화 상태
- last_synced_at (timestamp)
- created_at (timestamp)
```

### coupang_products (쿠팡 상품)
```sql
- id (uuid, PK)
- product_id (varchar, unique) -- 쿠팡 상품 ID
- sku (varchar) -- products 테이블 참조
- product_name (varchar)
- category (varchar)
- price (integer)
- sale_price (integer)
- status (varchar) -- 판매중/품절/중단
- created_at (timestamp)
- updated_at (timestamp)
```

### coupang_sync_logs (동기화 로그)
```sql
- id (uuid, PK)
- sync_type (varchar) -- orders/inventory/products
- status (varchar) -- success/error/partial
- items_synced (integer)
- items_failed (integer)
- error_message (text)
- duration_ms (integer)
- created_at (timestamp)
```

### inventory_comparison (재고 비교 뷰)
```sql
CREATE VIEW inventory_comparison AS
SELECT 
  p.sku,
  p.product_name,
  i.current_stock as playauto_stock,
  ci.coupang_stock,
  (i.current_stock - ci.coupang_stock) as stock_difference,
  CASE 
    WHEN ABS(i.current_stock - ci.coupang_stock) > 10 THEN 'critical'
    WHEN ABS(i.current_stock - ci.coupang_stock) > 5 THEN 'warning'
    ELSE 'normal'
  END as alert_level
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
LEFT JOIN coupang_inventory ci ON p.sku = ci.sku;
```

---

## 🔧 Edge Functions 설계

### 1. get-coupang-token
```typescript
// 쿠팡 API 인증 토큰 발급
// 환경변수: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY
```

### 2. sync-coupang-orders
```typescript
// 쿠팡 주문 정보 동기화
// 일별 자동 실행 + 수동 트리거
```

### 3. sync-coupang-inventory
```typescript
// 쿠팡 재고 조회 및 PlayAuto 재고와 비교
// 하루 2회 자동 실행
```

### 4. get-coupang-products
```typescript
// 쿠팡 등록 상품 목록 조회
// 주 1회 자동 실행
```

---

## 📊 대시보드 추가 화면

### 1. 주문 관리 탭
- 오늘의 주문 현황 카드
- 주문 목록 테이블 (필터링/검색)
- 주문 상태별 통계 차트
- 미발송 주문 알림

### 2. 재고 동기화 탭
- PlayAuto vs 쿠팡 재고 비교 테이블
- 재고 불일치 항목 하이라이트
- 수동 동기화 버튼
- 최근 동기화 로그

### 3. 판매 분석 탭
- 일별 판매 추이 차트
- SKU별 판매 순위
- 카테고리별 매출
- 재고 회전율 분석

---

## 🚀 구현 순서

### Phase 1: API 연동 준비
- [ ] 쿠팡 WING 판매자 계정 확인
- [ ] Open API 키 발급
- [ ] 로켓그로스 API 이용 동의
- [ ] API 문서 상세 검토

### Phase 2: 데이터베이스 구축
- [ ] Migration 파일 작성 (003_add_coupang_tables.sql)
- [ ] 테이블 생성 및 관계 설정
- [ ] 뷰 생성 (inventory_comparison 등)
- [ ] RLS 정책 설정

### Phase 3: Edge Functions 개발
- [ ] get-coupang-token 함수 생성
- [ ] sync-coupang-orders 함수 생성
- [ ] sync-coupang-inventory 함수 생성
- [ ] 에러 핸들링 및 로깅

### Phase 4: 대시보드 UI 확장
- [ ] 주문 관리 화면 추가
- [ ] 재고 비교 화면 추가
- [ ] 판매 분석 차트 추가
- [ ] 알림 기능 구현

### Phase 5: 테스트 및 배포
- [ ] 통합 테스트
- [ ] 실제 데이터 동기화 테스트
- [ ] 성능 최적화
- [ ] Railway 재배포

---

## 📚 참고 자료

- 쿠팡 개발자 센터: https://developers.coupangcorp.com/hc/ko/sections/35157469062553
- 로켓그로스 API 문서: (API 키 발급 후 확인)
- Open API 키 발급 가이드: WING 플랫폼 → 판매자 정보 → Open API 키 발급

---

## 💡 추가 아이디어

### 자동화
- 재고 불일치 시 자동 알림 (이메일/슬랙)
- 일일 판매 리포트 자동 생성
- 품절 임박 상품 자동 알림

### 분석
- 요일별 판매 패턴 분석
- 시즌별 베스트셀러 예측
- 재고 최적화 제안

### 확장
- 네이버 스마트스토어 연동
- 11번가 API 연동
- 통합 재고 관리 시스템

---

**다음 단계**: PlayAuto 대시보드 완성 및 배포 후 이 문서를 기반으로 구현 시작

