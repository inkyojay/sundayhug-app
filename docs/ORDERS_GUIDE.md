# 📦 PlayAuto 주문 관리 시스템 가이드

**썬데이허그 - 주문 조회 및 관리**

---

## 🎯 주요 기능

### 1. 캐시 우선 조회 ⚡
- Supabase에 데이터가 있으면 **즉시 반환** (API 호출 없음)
- 없으면 PlayAuto API 호출 후 저장

### 2. 강제 새로고침 🔄
- `forceRefresh: true`로 API 강제 호출
- 최신 데이터 동기화

### 3. 유연한 필터링 🔍
- 기간별 조회 (기본 7일)
- 쇼핑몰별 필터
- 주문 상태별 필터

---

## 🗄️ 데이터베이스 구조

### `orders` 테이블 (주문 마스터)
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    uniq VARCHAR(50) UNIQUE,        -- 주문 고유번호
    bundle_no VARCHAR(50),           -- 묶음 번호
    ord_status VARCHAR(50),          -- 주문 상태
    shop_name VARCHAR(100),          -- 쇼핑몰명
    shop_ord_no VARCHAR(100),        -- 쇼핑몰 주문번호
    invoice_no VARCHAR(50),          -- 송장번호
    pay_amt DECIMAL(12,2),           -- 결제 금액
    sale_cnt INTEGER,                -- 주문 수량
    to_name VARCHAR(50),             -- 수령자명
    to_tel VARCHAR(30),              -- 수령자 전화번호
    to_addr1 VARCHAR(255),           -- 주소1
    to_addr2 VARCHAR(255),           -- 주소2
    ord_time TIMESTAMPTZ,            -- 주문 시간
    synced_at TIMESTAMPTZ,           -- 동기화 시간
    ...
);
```

### `order_sync_logs` 테이블 (동기화 로그)
```sql
CREATE TABLE order_sync_logs (
    id UUID PRIMARY KEY,
    sync_type VARCHAR(20),           -- auto / manual / cache
    status VARCHAR(20),              -- success / error / cached
    orders_synced INTEGER,           -- 동기화된 주문 수
    source VARCHAR(20),              -- api / cache
    duration_ms INTEGER,             -- 소요 시간
    ...
);
```

---

## 🔧 API 사용 방법

### Edge Function: `sync-orders`

**엔드포인트**:
```
POST https://ugzwgegkvxcczwiottej.supabase.co/functions/v1/sync-orders
```

**Headers**:
```json
{
  "Authorization": "Bearer {SUPABASE_ANON_KEY}",
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "forceRefresh": false,    // true면 강제로 API 호출
  "daysAgo": 7,             // 조회 기간 (일)
  "shopCd": "",             // 쇼핑몰 코드 (선택)
  "status": []              // 주문 상태 배열 (선택)
}
```

**Response (캐시)**:
```json
{
  "success": true,
  "message": "캐시에서 주문 조회 완료",
  "source": "cache",
  "data": {
    "orders": [ /* 주문 배열 */ ],
    "orderCount": 150,
    "fromCache": true
  }
}
```

**Response (API 호출)**:
```json
{
  "success": true,
  "message": "주문 동기화 완료",
  "source": "api",
  "data": {
    "orders": [ /* 주문 배열 */ ],
    "orderCount": 150,
    "ordersSynced": 150,
    "ordersFailed": 0,
    "durationMs": 5234,
    "fromCache": false
  }
}
```

---

## 📊 사용 예시

### 1. 기본 조회 (캐시 우선)
```javascript
const response = await fetch(
  'https://ugzwgegkvxcczwiottej.supabase.co/functions/v1/sync-orders',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      forceRefresh: false,
      daysAgo: 7
    })
  }
);

const data = await response.json();
console.log(data.data.orders);  // 주문 배열
```

### 2. 강제 새로고침
```javascript
const response = await fetch(
  'https://ugzwgegkvxcczwiottej.supabase.co/functions/v1/sync-orders',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      forceRefresh: true,  // 강제로 API 호출
      daysAgo: 7
    })
  }
);
```

### 3. 특정 기간 + 쇼핑몰 필터
```javascript
const response = await fetch(
  'https://ugzwgegkvxcczwiottej.supabase.co/functions/v1/sync-orders',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      daysAgo: 30,          // 최근 30일
      shopCd: "A001",       // 특정 쇼핑몰만
      status: ["결제완료", "상품준비중"]  // 특정 상태만
    })
  }
);
```

---

## 🎯 동작 흐름

```
사용자 요청
    ↓
forceRefresh = true?
    ↓ NO
Supabase 캐시 확인
    ↓ 있음?
✅ 캐시 데이터 반환 (빠름!)
    ↓ 없음
📡 PlayAuto API 호출
    ↓
💾 Supabase에 저장
    ↓
✅ 저장된 데이터 반환
```

---

## 📋 주문 상태 목록

PlayAuto API에서 반환하는 주요 주문 상태:

| 상태 | 설명 |
|------|------|
| `결제완료` | 결제 완료 |
| `상품준비중` | 상품 준비 중 |
| `송장등록` | 송장 등록 완료 |
| `출고완료` | 출고 완료 |
| `배송중` | 배송 중 |
| `배송완료` | 배송 완료 |
| `구매확정` | 구매 확정 |
| `취소요청` | 취소 요청 |
| `취소완료` | 취소 완료 |
| `반품요청` | 반품 요청 |
| `반품완료` | 반품 완료 |
| `교환요청` | 교환 요청 |
| `교환완료` | 교환 완료 |

---

## 🔍 유용한 SQL 쿼리

### 1. 최근 7일 주문 조회
```sql
SELECT * FROM orders
WHERE ord_time >= NOW() - INTERVAL '7 days'
ORDER BY ord_time DESC;
```

### 2. 주문 상태별 통계
```sql
SELECT ord_status, COUNT(*), SUM(pay_amt)
FROM orders
GROUP BY ord_status;
```

### 3. 쇼핑몰별 주문 수
```sql
SELECT shop_name, COUNT(*) as order_count
FROM orders
WHERE ord_time >= NOW() - INTERVAL '30 days'
GROUP BY shop_name
ORDER BY order_count DESC;
```

### 4. 미출고 주문 (송장 없음)
```sql
SELECT * FROM orders
WHERE ord_status IN ('결제완료', '상품준비중')
  AND (invoice_no IS NULL OR invoice_no = '')
ORDER BY ord_time ASC;
```

---

## 🚀 배포 방법

### 1. Supabase CLI로 배포
```bash
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"
npx supabase functions deploy sync-orders
```

### 2. 배포 확인
```bash
# 테스트 호출
curl -X POST "https://ugzwgegkvxcczwiottej.supabase.co/functions/v1/sync-orders" \
  -H "Authorization: Bearer {ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"daysAgo": 7}'
```

---

## 💡 최적화 팁

### 1. 캐시 활용
- 대시보드 첫 로딩: `forceRefresh: false` (캐시 우선)
- "새로고침" 버튼: `forceRefresh: true` (API 호출)

### 2. 조회 기간 최적화
- 일반 조회: `daysAgo: 7` (최근 7일)
- 통계/분석: `daysAgo: 30` (최근 30일)

### 3. 필터 활용
- 특정 쇼핑몰만: `shopCd` 지정
- 특정 상태만: `status` 배열 지정

---

## 🐛 문제 해결

### 문제 1: "토큰을 가져올 수 없습니다"
**원인**: PlayAuto 인증 토큰 만료
**해결**: `get-playauto-token` 함수가 자동으로 재발급

### 문제 2: "주문 조회 실패: 401"
**원인**: PlayAuto API 키 또는 토큰 문제
**해결**: Supabase Secrets 확인

### 문제 3: 캐시에 데이터가 없음
**원인**: 첫 조회 또는 오래된 데이터
**해결**: 자동으로 API 호출하여 저장됨

---

**다음 단계**: 대시보드에 주문 리스트 탭 추가! 🖥️



