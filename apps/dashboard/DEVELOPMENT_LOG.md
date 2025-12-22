# 썬데이허그 관리자 대시보드 (Dashboard App) 개발 일지

## 프로젝트 정보
- **앱 이름**: @sundayhug/dashboard
- **도메인**: admin.sundayhug.com
- **Vercel 프로젝트**: sundayhug-dashboard
- **GitHub**: https://github.com/inkyojay/sundayhug-app (apps/dashboard)
- **Supabase**: JAYCORP 프로젝트 (ugzwgegkvxcczwiottej) - 고객 앱과 공유

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

