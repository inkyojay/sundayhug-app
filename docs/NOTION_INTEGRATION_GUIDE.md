# 🔗 노션 → Supabase 연동 가이드

노션에서 제품 정보를 관리하고, Supabase로 자동 동기화하는 완벽 가이드입니다.

---

## 📊 연동 개요

```
노션 (제품 분류 DB) → Supabase (parent_products)
노션 (Solo SKU DB)  → Supabase (products)
```

**특징:**
- ✅ 노션에서 편하게 제품 정보 관리
- ✅ 자동 동기화 (수동 트리거 또는 스케줄링)
- ✅ Parent SKU ↔ Solo SKU 자동 매핑
- ✅ 팀원 누구나 코딩 없이 데이터 관리 가능

---

## 1️⃣ 노션 데이터베이스 준비

### 데이터베이스 1: 제품 분류 (Parent Products)

**필수 속성 (Properties):**

| 속성명 | 타입 | 필수 | 설명 | 예시 |
|--------|------|------|------|------|
| Parent SKU | Text | ✅ | 상위 제품 SKU 코드 | `PARENT-SLEEPINGBAG` |
| 제품명 (Name) | Title | ✅ | 제품 이름 | `슬리핑백` |
| 카테고리 (Category) | Select | ⭕ | 대분류 | `수면용품` |
| 서브카테고리 (Subcategory) | Select | ⭕ | 소분류 | `슬리핑백` |
| 설명 (Description) | Text | ⭕ | 제품 설명 | `신생아 슬리핑백 전체 라인업` |
| 활성화 (Active) | Checkbox | ⭕ | 활성 상태 | ☑️ |

**샘플 데이터:**

| Parent SKU | 제품명 | 카테고리 | 서브카테고리 | 설명 | 활성화 |
|------------|--------|----------|--------------|------|--------|
| PARENT-SLEEPINGBAG | 슬리핑백 | 수면용품 | 슬리핑백 | 신생아 슬리핑백 전체 라인업 | ☑️ |
| PARENT-SWADDLE | 속싸개 | 수면용품 | 속싸개 | 신생아 속싸개 제품군 | ☑️ |
| PARENT-BODYSUIT | 바디수트 | 의류 | 바디수트 | 아기 바디수트 전체 라인업 | ☑️ |

---

### 데이터베이스 2: Solo SKU (Solo Products)

**필수 속성 (Properties):**

| 속성명 | 타입 | 필수 | 설명 | 예시 |
|--------|------|------|------|------|
| SKU (Solo SKU) | Text | ✅ | PlayAuto SKU 코드 | `SHSB-BEIGE-S` |
| 제품명 (Name) | Title | ✅ | 옵션 포함 제품명 | `슬리핑백 베이지 S` |
| Parent SKU | Text | ✅ | 상위 제품 SKU | `PARENT-SLEEPINGBAG` |
| 활성화 (Active) | Checkbox | ⭕ | 활성 상태 | ☑️ |

**샘플 데이터:**

| SKU | 제품명 | Parent SKU | 활성화 |
|-----|--------|------------|--------|
| SHSB-BEIGE-S | 슬리핑백 베이지 S | PARENT-SLEEPINGBAG | ☑️ |
| SHSB-BEIGE-M | 슬리핑백 베이지 M | PARENT-SLEEPINGBAG | ☑️ |
| SHSB-PINK-S | 슬리핑백 핑크 S | PARENT-SLEEPINGBAG | ☑️ |

---

## 2️⃣ 노션 Integration 생성

### 2-1. Integration 만들기

1. **https://www.notion.so/my-integrations** 접속
2. **+ New integration** 버튼 클릭
3. 정보 입력:
   - **Name**: `Sundayhug Supabase Sync`
   - **Associated workspace**: 본인 워크스페이스 선택
   - **Type**: Internal
4. **Capabilities** 설정:
   - ✅ **Read content**
   - ❌ Update content (필요 없음)
   - ❌ Insert content (필요 없음)
5. **Submit** 버튼 클릭

### 2-2. API Key 복사

- Integration을 만들면 **Internal Integration Token**이 생성됩니다
- `secret_...` 형태의 키를 복사하세요 (나중에 Supabase에 입력)

### 2-3. 노션 데이터베이스에 Integration 연결

**제품 분류 데이터베이스:**
1. 노션에서 **제품 분류 데이터베이스** 페이지 열기
2. 오른쪽 상단 **...** (점 3개) 클릭
3. **Connections** → **Connect to** 클릭
4. 방금 만든 Integration (`Sundayhug Supabase Sync`) 선택

**Solo SKU 데이터베이스:**
1. 노션에서 **Solo SKU 데이터베이스** 페이지 열기
2. 동일하게 Integration 연결

---

## 3️⃣ 노션 데이터베이스 ID 가져오기

### 데이터베이스 ID 찾는 방법:

1. 노션에서 데이터베이스 페이지를 **새 창으로 열기** (Share → Copy link)
2. URL 확인:
   ```
   https://www.notion.so/워크스페이스명/데이터베이스ID?v=뷰ID
   ```
   
3. **데이터베이스 ID** 부분 복사 (32자리 영숫자)
   
   예시:
   ```
   https://www.notion.so/sundayhug/a1b2c3d4e5f6789012345678abcdef?v=...
   ```
   → 데이터베이스 ID: `a1b2c3d4e5f6789012345678abcdef`

4. **하이픈 제거** (있으면):
   - `a1b2c3d4-e5f6-7890-1234-5678abcdef` → `a1b2c3d4e5f6789012345678abcdef`

**두 개의 데이터베이스 ID를 메모하세요:**
- 제품 분류 DB ID: `____________________`
- Solo SKU DB ID: `____________________`

---

## 4️⃣ Supabase 설정

### 4-1. 데이터베이스 마이그레이션 실행

1. Supabase 대시보드 접속
2. **SQL Editor** 메뉴 클릭
3. **New query** 버튼 클릭
4. 프로젝트의 `supabase/migrations/002_add_parent_products.sql` 파일 내용 전체 복사
5. SQL Editor에 붙여넣기
6. **RUN** 버튼 클릭

✅ 완료되면 `parent_products`, `notion_sync_logs` 테이블이 생성됩니다.

### 4-2. 환경 변수 추가

1. Supabase → **Edge Functions** → 아무 함수 선택
2. **Settings** 탭 클릭
3. 환경 변수 추가:

```
NOTION_API_KEY=secret_your_notion_integration_token
NOTION_PARENT_PRODUCTS_DB_ID=제품분류_데이터베이스_ID
NOTION_SOLO_PRODUCTS_DB_ID=Solo_SKU_데이터베이스_ID
```

**예시:**
```
NOTION_API_KEY=secret_abc123xyz456
NOTION_PARENT_PRODUCTS_DB_ID=a1b2c3d4e5f6789012345678abcdef
NOTION_SOLO_PRODUCTS_DB_ID=fedcba9876543210fedcba9876543210
```

4. **Save** 버튼 클릭

### 4-3. Edge Function 배포

```bash
# 로컬 터미널에서 실행
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"

# Supabase CLI로 배포
supabase functions deploy sync-notion-products
```

또는 **Supabase 웹 대시보드에서 직접 배포:**
1. Edge Functions → **Create a new function**
2. Function name: `sync-notion-products`
3. 프로젝트의 `supabase/functions/sync-notion-products/index.ts` 파일 내용 복사
4. 붙여넣기 후 **Deploy** 클릭

---

## 5️⃣ 동기화 테스트

### 수동 테스트 (Supabase 대시보드):

1. Supabase → **Edge Functions** → `sync-notion-products` 선택
2. **Invoke** 버튼 클릭
3. 로그 확인:
   ```
   ✅ Parent Products: 3개 동기화
   ✅ Solo Products: 25개 동기화
   ```

### 대시보드에서 확인:

1. Supabase → **Table Editor**
2. `parent_products` 테이블 확인 → 노션 데이터가 들어왔는지 확인
3. `products` 테이블 확인 → `parent_sku` 컬럼이 매핑되었는지 확인

---

## 6️⃣ 자동 동기화 설정 (선택사항)

### 방법 1: 대시보드에 버튼 추가

웹 대시보드에 "노션 동기화" 버튼을 추가하여 클릭 한 번으로 동기화:

```javascript
// dashboard/app.js에 추가
async function syncNotion() {
    const response = await fetch(
        'https://your-project.supabase.co/functions/v1/sync-notion-products',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            }
        }
    );
    const data = await response.json();
    alert(`동기화 완료: Parent ${data.data.parent_products.synced}개, Solo ${data.data.solo_products.synced}개`);
}
```

### 방법 2: 주기적 자동 동기화 (Supabase Cron)

하루 2번 자동으로 노션 데이터 동기화:

```sql
-- Supabase SQL Editor에서 실행
SELECT cron.schedule(
    'sync-notion-daily',
    '0 9,18 * * *',  -- 매일 오전 9시, 오후 6시
    $$
    SELECT net.http_post(
        url:='https://your-project.supabase.co/functions/v1/sync-notion-products',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) AS request_id;
    $$
);
```

---

## 7️⃣ 노션 속성 이름 커스터마이징

Edge Function 코드에서 노션 속성 이름을 수정할 수 있습니다:

```typescript
// supabase/functions/sync-notion-products/index.ts

// 예시: 노션에서 "상품명" 대신 "제품이름"을 사용한다면
product_name: getPlainText(props["제품이름"]) || getPlainText(props["Name"]) || "",
```

현재 지원하는 속성 이름:
- **Parent SKU**, **제품명/Name**, **카테고리/Category**, **서브카테고리/Subcategory**, **설명/Description**, **활성화/Active**
- **SKU/Solo SKU**, **제품명/Name**, **Parent SKU**, **활성화/Active**

---

## 8️⃣ 데이터 흐름 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        노션 워크스페이스                      │
│  ┌────────────────────┐      ┌────────────────────┐        │
│  │  제품 분류 DB       │      │  Solo SKU DB       │        │
│  │  (Parent Products) │      │  (Solo Products)   │        │
│  └────────────────────┘      └────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                     │ Notion API (자동 동기화)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Edge Function                     │
│              sync-notion-products (TypeScript)               │
│  - 노션 데이터 조회 (페이지네이션)                           │
│  - 데이터 변환 및 검증                                        │
│  - Supabase 테이블 업데이트                                   │
└─────────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   Supabase PostgreSQL                        │
│  ┌─────────────────────┐    ┌────────────────────┐         │
│  │ parent_products     │    │ products           │         │
│  │ - parent_sku (PK)   │←───│ - parent_sku (FK)  │         │
│  │ - product_name      │    │ - sku (PK)         │         │
│  │ - category          │    │ - product_name     │         │
│  │ - notion_page_id    │    │ - notion_page_id   │         │
│  └─────────────────────┘    └────────────────────┘         │
│                                      ↓                       │
│                              ┌────────────────────┐         │
│                              │ inventory          │         │
│                              │ - current_stock    │         │
│                              │ - product_id (FK)  │         │
│                              └────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      웹 대시보드                              │
│  - Parent SKU별 재고 집계 표시                               │
│  - Solo SKU 상세 재고 현황                                    │
│  - 제품 분류별 필터링                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 9️⃣ 문제 해결

### Q1: 노션 데이터가 Supabase에 안 들어와요

**확인 사항:**
1. 노션 Integration이 두 데이터베이스에 모두 연결되었는지 확인
2. Supabase 환경 변수가 정확히 입력되었는지 확인
3. 노션 데이터베이스에 필수 속성(Parent SKU, SKU, 제품명)이 있는지 확인

**디버깅:**
- Supabase Edge Functions 로그 확인: **Logs** 탭에서 에러 메시지 확인

### Q2: Parent SKU 매핑이 안 돼요

**원인:**
- Solo SKU 데이터베이스의 `Parent SKU` 값이 제품 분류 데이터베이스의 `Parent SKU`와 일치하지 않음

**해결:**
- 노션에서 두 데이터베이스의 Parent SKU 값을 정확히 일치시키세요
- 대소문자, 공백 주의

### Q3: 일부 속성이 null로 들어와요

**원인:**
- 노션 속성 이름이 Edge Function 코드와 다름

**해결:**
- `sync-notion-products/index.ts` 파일의 `parseParentProduct()`, `parseSoloProduct()` 함수에서 속성 이름 수정

---

## 🎉 완료!

이제 노션에서 제품 정보를 수정하면, 버튼 한 번으로 Supabase와 동기화됩니다!

**다음 단계:**
- PlayAuto 재고 데이터와 노션 제품 정보가 자동으로 결합됩니다
- 대시보드에서 제품 분류별 재고 현황을 확인할 수 있습니다

---

**제작일**: 2025년 11월 12일  
**문의**: 문제 발생 시 스크린샷과 함께 연락주세요!


