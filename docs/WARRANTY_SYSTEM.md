# 🛡️ 디지털 보증서 시스템 가이드

**작성일**: 2025년 11월 27일  
**버전**: 1.0.0

---

## 📌 개요

썬데이허그 제품(접이식 아기침대 등)에 대한 디지털 보증서 발급 및 관리 시스템입니다.

### 주요 기능
- 고객: 보증서 등록, 조회, A/S 신청
- 관리자: 보증서 승인/거절, A/S 관리

---

## 🔗 라우트 구조

### 고객용 (Public - 로그인 불필요)
| URL | 설명 |
|-----|------|
| `/warranty` | 보증서 등록 |
| `/warranty/view/:id` | 보증서 조회 |
| `/warranty/as/:id` | A/S 신청 |

### 관리자용 (로그인 필수)
| URL | 설명 |
|-----|------|
| `/dashboard/warranty` | 보증서 목록 |
| `/dashboard/warranty/pending` | 승인 대기 |
| `/dashboard/warranty/:id` | 보증서 상세 |
| `/dashboard/warranty/as` | A/S 관리 |

---

## 📊 데이터베이스 테이블

### customers (고객 정보)
```sql
- id: UUID (PK)
- name: VARCHAR(100)
- phone: VARCHAR(20) UNIQUE
- email: VARCHAR(255)
- kakao_id: VARCHAR(100)
- kakao_nickname: VARCHAR(100)
- created_at, updated_at
```

### warranty_products (보증 대상 제품)
```sql
- id: UUID (PK)
- product_code: VARCHAR(50) UNIQUE
- product_name: VARCHAR(255)
- category: VARCHAR(100)
- warranty_months: INTEGER (기본 12개월)
- product_image_url: TEXT
- is_active: BOOLEAN
- created_at, updated_at
```

### warranties (보증서)
```sql
- id: UUID (PK)
- warranty_number: VARCHAR(100) UNIQUE (SH-W-YYYYMMDD-XXXX)
- customer_id: FK → customers
- order_id: FK → orders
- tracking_number: VARCHAR(100)
- customer_phone: VARCHAR(20)
- product_name, product_option: VARCHAR(255)
- warranty_start, warranty_end: DATE
- product_photo_url: TEXT
- status: ENUM ('pending', 'approved', 'rejected', 'expired')
- approved_at, approved_by, rejection_reason
- kakao_sent: BOOLEAN
- created_at, updated_at
```

### as_requests (A/S 신청)
```sql
- id: UUID (PK)
- warranty_id: FK → warranties
- request_type: ENUM ('repair', 'exchange', 'refund', 'inquiry')
- issue_description: TEXT
- issue_photos: TEXT[]
- contact_name, contact_phone: VARCHAR
- status: ENUM ('received', 'processing', 'completed', 'cancelled')
- assigned_to, resolution: VARCHAR/TEXT
- completed_at: TIMESTAMP
- created_at, updated_at
```

### warranty_logs (이력)
```sql
- id: UUID (PK)
- warranty_id: FK → warranties
- action: VARCHAR(50)
- description: TEXT
- performed_by: VARCHAR(100)
- previous_data, new_data: JSONB
- created_at
```

---

## 🔄 워크플로우

### 1. 보증서 등록 (고객)
```
1. /warranty 접속
2. 송장번호 + 연락처 입력
3. orders 테이블에서 검증
4. 주문 정보 확인
5. (선택) 제품 사진 업로드
6. warranties 테이블에 저장 (status: 'pending')
7. 완료 화면 표시
```

### 2. 보증서 승인 (관리자)
```
1. /dashboard/warranty/pending 접속
2. 대기 목록 확인
3. 제품 사진 검토
4. 승인 → status: 'approved', 보증기간 설정
   또는 거절 → status: 'rejected', 사유 입력
5. (TODO) 카카오 알림톡 발송
```

### 3. A/S 신청 (고객)
```
1. 보증서 조회 페이지에서 "A/S 신청" 클릭
2. 신청 유형 선택 (수리/교환/환불/문의)
3. 증상/내용 입력
4. 연락처 확인/수정
5. 제출 → as_requests 테이블 저장
```

---

## 🗂️ 파일 구조

```
supaplate-master/app/features/warranty/
├── screens/
│   ├── warranty-list.tsx        # 보증서 목록 (관리자)
│   ├── warranty-pending.tsx     # 승인 대기 (관리자)
│   ├── warranty-detail.tsx      # 보증서 상세 (관리자)
│   ├── as-list.tsx              # A/S 목록 (관리자)
│   └── public/
│       ├── register.tsx         # 보증서 등록 (고객)
│       ├── view.tsx             # 보증서 조회 (고객)
│       └── as-request.tsx       # A/S 신청 (고객)

supabase/migrations/
└── 005_add_warranty_tables.sql  # DB 마이그레이션
```

---

## ⚙️ 설정 방법

### 1. DB 마이그레이션 적용
```bash
# Supabase Dashboard에서 SQL 실행
# 또는 supabase CLI 사용
supabase db push
```

### 2. 초기 제품 데이터 등록
```sql
INSERT INTO warranty_products (product_code, product_name, category, warranty_months) VALUES
    ('CB-001', '접이식 아기침대', '침대', 12),
    ('CB-002', '접이식 아기침대 프리미엄', '침대', 24);
```

### 3. Supabase Storage 버킷 생성 (이미지 업로드용)
```sql
-- warranty-photos 버킷 생성
INSERT INTO storage.buckets (id, name, public) VALUES ('warranty-photos', 'warranty-photos', true);
```

---

## 🔜 TODO (추후 개발)

- [ ] 카카오 로그인 연동 (본인인증)
- [ ] 카카오 알림톡 발송 (승인 완료, A/S 접수 등)
- [ ] 제품 사진 업로드 (Supabase Storage)
- [ ] 보증서 만료 알림 (30일 전)
- [ ] 보증서 PDF 다운로드
- [ ] QR코드 생성 (제품 부착용)

---

## 📝 참고사항

### 보증서 번호 형식
- 형식: `SH-W-YYYYMMDD-XXXX`
- 예시: `SH-W-20251127-0001`
- 자동 생성 함수: `generate_warranty_number()`

### 주문 검증 로직
- 기존 `orders` 테이블의 `invoice_no` (송장번호)와 `to_tel`/`to_htel` (연락처) 매칭
- PlayAuto에서 동기화된 주문 데이터 활용

### 보증 기간
- 기본: 승인일로부터 1년
- 제품별 설정 가능 (`warranty_products.warranty_months`)

---

**문서 버전**: 1.0.0  
**최종 수정**: 2025년 11월 27일

