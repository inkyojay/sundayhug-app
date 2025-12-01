# 📡 PlayAuto API 연동 가이드

## PlayAuto API 정보 확인 방법

### 1. API 토큰 발급
1. PlayAuto 관리자 페이지 로그인
2. **설정** 또는 **API 설정** 메뉴 이동
3. **API 키 발급** 또는 **토큰 생성** 버튼 클릭
4. 발급된 토큰 복사 및 안전하게 보관

### 2. API 엔드포인트 확인
PlayAuto 고객지원팀에 문의하여 다음 정보 요청:
- 재고 조회 API 엔드포인트 URL
- API 요청 방식 (GET/POST)
- 응답 데이터 형식 (JSON 구조)

일반적인 형식:
```
https://api.playauto.io/v1/inventory
또는
https://playauto.io/api/inventory/list
```

---

## 📋 API 응답 형식 분석

PlayAuto에서 제공하는 실제 API 응답을 확인하여 필드명을 파악해야 합니다.

### 예상되는 응답 형식 1 (배열 형태)
```json
[
  {
    "sku": "SH-001",
    "productName": "슬리핑백",
    "stock": 150
  },
  {
    "sku": "SH-002",
    "productName": "테리타올",
    "stock": 80
  }
]
```

### 예상되는 응답 형식 2 (객체 + 배열)
```json
{
  "success": true,
  "data": [
    {
      "SKU": "SH-001",
      "name": "슬리핑백",
      "quantity": 150
    }
  ]
}
```

### 예상되는 응답 형식 3 (페이지네이션)
```json
{
  "status": "success",
  "items": [
    {
      "productCode": "SH-001",
      "productName": "슬리핑백",
      "currentStock": 150,
      "reservedStock": 10
    }
  ],
  "total": 100,
  "page": 1
}
```

---

## 🔧 Edge Function 수정 가이드

실제 PlayAuto API 응답 형식에 맞게 `sync-inventory/index.ts` 파일을 수정해야 합니다.

### 수정이 필요한 부분 1: API 응답 파싱

파일 위치: `/supabase/functions/sync-inventory/index.ts`

**현재 코드 (85-88줄):**
```typescript
const inventoryItems = Array.isArray(playautoData) 
  ? playautoData 
  : playautoData.items || playautoData.data || [];
```

**수정 예시:**
PlayAuto 응답이 `{ products: [...] }` 형태라면:
```typescript
const inventoryItems = playautoData.products || [];
```

### 수정이 필요한 부분 2: 필드 매핑

**현재 코드 (97-98줄):**
```typescript
const sku = item.sku || item.SKU || item.productCode;
const stock = parseInt(item.stock || item.quantity || item.currentStock || 0);
```

**수정 방법:**
1. PlayAuto 실제 응답에서 SKU 필드명 확인
2. 재고 수량 필드명 확인
3. 위 코드를 실제 필드명에 맞게 수정

예를 들어, PlayAuto가 `product_code`와 `available_stock`를 사용한다면:
```typescript
const sku = item.product_code;
const stock = parseInt(item.available_stock || 0);
```

---

## 🧪 API 연동 테스트 방법

### 1. 터미널에서 직접 API 호출 테스트
```bash
curl -X GET "https://api.playauto.io/v1/inventory" \
  -H "Authorization: Bearer YOUR_PLAYAUTO_TOKEN" \
  -H "Content-Type: application/json"
```

응답 결과를 확인하여 정확한 필드명 파악

### 2. Edge Function 로그 확인
```bash
supabase functions logs sync-inventory --tail
```

실시간으로 Edge Function 실행 로그 확인

### 3. 웹 대시보드에서 테스트
1. 대시보드 접속
2. 브라우저 개발자 도구 열기 (F12)
3. Console 탭 확인
4. **재고 동기화** 버튼 클릭
5. 에러 메시지 확인

---

## 🔄 필드 매핑 치트시트

| PlayAuto 필드 (예상) | 시스템 필드 | 설명 |
|---------------------|------------|------|
| `sku`, `SKU`, `productCode` | `sku` | 제품 SKU 코드 |
| `stock`, `quantity`, `currentStock` | `current_stock` | 현재 재고 수량 |
| `productName`, `name`, `title` | `product_name` | 제품명 (선택) |
| `category` | `category` | 카테고리 (선택) |

---

## ⚠️ 주의사항

### 1. API Rate Limit
- PlayAuto API에 요청 제한이 있을 수 있습니다
- 하루 2번 동기화로 충분히 안전합니다
- 필요시 PlayAuto 측에 API 호출 제한 확인

### 2. 인증 토큰 보안
- API 토큰은 절대 코드에 직접 입력하지 마세요
- 반드시 Supabase Edge Function 환경 변수에 저장
- 토큰이 노출되면 즉시 재발급

### 3. 데이터 형식 검증
- API 응답이 예상과 다를 수 있습니다
- 로그를 통해 실제 응답 구조 확인 필수
- 필요시 Edge Function 코드 수정

---

## 📞 PlayAuto 고객지원 문의 사항

API 연동을 위해 PlayAuto 측에 다음 정보를 요청하세요:

1. **API 문서 또는 명세서**
   - 재고 조회 API 엔드포인트
   - 요청/응답 형식
   - 인증 방법

2. **필드 정의**
   - SKU 코드 필드명
   - 재고 수량 필드명
   - 기타 제공되는 데이터 필드

3. **제약사항**
   - API 호출 제한 (Rate Limit)
   - 동시 접속 제한
   - 응답 데이터 크기 제한

4. **샘플 데이터**
   - 실제 API 응답 JSON 예제
   - 테스트 계정 또는 Sandbox 환경

---

## ✅ 연동 완료 체크리스트

- [ ] PlayAuto API 토큰 발급 완료
- [ ] API 엔드포인트 URL 확인
- [ ] 터미널에서 API 호출 테스트 성공
- [ ] 응답 데이터 구조 파악
- [ ] Edge Function 필드 매핑 수정
- [ ] Edge Function 환경 변수 설정
- [ ] 웹 대시보드에서 수동 동기화 테스트
- [ ] 재고 데이터가 정상적으로 표시됨
- [ ] 자동 스케줄링 설정 완료

---

**연동이 완료되면 실시간 재고 관리 시스템이 정상 작동합니다!** 🎉


