# 썬데이허그 관리자 대시보드 (Dashboard App) 개발 일지

## 프로젝트 정보
- **앱 이름**: @sundayhug/dashboard
- **도메인**: admin.sundayhug.com
- **Vercel 프로젝트**: sundayhug-dashboard
- **GitHub**: https://github.com/inkyojay/sundayhug-app (apps/dashboard)
- **Supabase**: JAYCORP 프로젝트 (ugzwgegkvxcczwiottej) - 고객 앱과 공유

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

