# 썬데이허그 앱 아키텍처

Turborepo 기반 모노레포 아키텍처 전체 가이드

## 📋 목차

- [모노레포 구조](#모노레포-구조)
- [서비스 의존성 그래프](#서비스-의존성-그래프)
- [공유 패키지 패턴](#공유-패키지-패턴)
- [환경 변수 관계](#환경-변수-관계)
- [배포 토폴로지](#배포-토폴로지)
- [데이터 플로우](#데이터-플로우)
- [기술 스택 개요](#기술-스택-개요)
- [개발 워크플로우](#개발-워크플로우)

---

## 모노레포 구조

```
sundayhug-app/
├── apps/                           # 애플리케이션 레이어
│   ├── customer/                   # 고객 앱 (app.sundayhug.kr)
│   │   ├── app/
│   │   │   ├── core/               # 인프라 레이어
│   │   │   │   ├── components/ui/  # shadcn/ui 컴포넌트
│   │   │   │   ├── db/             # DB 인프라
│   │   │   │   ├── lib/            # 핵심 유틸리티
│   │   │   │   ├── layouts/        # 앱 레이아웃
│   │   │   │   └── hooks/          # 공유 React 훅
│   │   │   ├── shared/             # 공유 서비스
│   │   │   │   └── services/
│   │   │   │       ├── notification/ # SMS/알림톡
│   │   │   │       └── storage/    # 파일 저장소
│   │   │   └── features/           # 기능 모듈 (격리됨)
│   │   │       ├── auth/           # 인증
│   │   │       ├── warranty/       # 보증서 관리
│   │   │       ├── sleep-analysis/ # 수면 분석
│   │   │       ├── chat/           # AI 상담
│   │   │       ├── payments/       # 결제
│   │   │       └── ...
│   │   └── ARCHITECTURE.md         # 앱별 아키텍처 가이드
│   │
│   ├── dashboard/                  # 관리자 대시보드 (admin.sundayhug.kr)
│   │   └── app/
│   │       ├── core/               # 인프라 레이어
│   │       ├── shared/             # 공유 서비스
│   │       └── features/           # 기능 모듈
│   │
│   └── mobile/                     # 모바일 앱 (React Native)
│       └── src/
│           ├── core/               # 인프라 레이어
│           ├── shared/             # 공유 서비스
│           └── features/           # 기능 모듈
│
├── packages/                       # 공유 패키지 레이어
│   ├── ui/                         # 공통 UI 컴포넌트 (@sundayhug/ui)
│   │   └── src/
│   │       └── components/         # Radix UI 기반 컴포넌트
│   │
│   ├── database/                   # Supabase 클라이언트 (@sundayhug/database)
│   │   └── src/
│   │       ├── client.server.ts    # 클라이언트용 DB
│   │       ├── admin.server.ts     # 관리자용 DB
│   │       └── types.ts            # DB 타입
│   │
│   └── shared/                     # 공통 유틸/타입 (@sundayhug/shared)
│       └── src/
│           ├── hooks/              # 공통 React 훅
│           └── lib/                # 공통 유틸리티
│
├── naver-proxy/                    # 네이버 커머스 API 프록시 (Railway)
│   ├── index.js                    # Express 서버
│   └── railway.json                # Railway 배포 설정
│
├── turbo.json                      # Turborepo 설정
└── package.json                    # Monorepo 루트 설정
```

### 아키텍처 레이어

각 앱은 3-Layer 아키텍처를 따릅니다:

```
┌─────────────────────────────────┐
│   Features (기능 모듈)            │  ← 비즈니스 로직, 독립적 격리
├─────────────────────────────────┤
│   Shared (공유 서비스)            │  ← 범용 서비스 (notification, storage)
├─────────────────────────────────┤
│   Core (인프라)                   │  ← UI 컴포넌트, DB, 핵심 유틸
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│   Packages (공유 패키지)          │  ← 앱 간 공유 코드
└─────────────────────────────────┘
```

**의존성 방향 규칙:**
- Features → Shared → Core → Packages (단방향)
- Feature ↔ Feature 직접 의존 금지 (index.ts를 통한 타입만 허용)
- Core/Shared → Feature 역방향 의존 금지

---

## 서비스 의존성 그래프

```
                    ┌──────────────┐
                    │  Supabase    │
                    │  (Database)  │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Customer    │  │   Dashboard   │  │    Mobile     │
│   (React)     │  │   (React)     │  │ (React Native)│
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────┐                 ┌────────────────┐
│ @sundayhug/ui    │                 │ Naver Proxy    │
│ @sundayhug/db    │                 │ (Express)      │
│ @sundayhug/shared│                 └────────────────┘
└──────────────────┘                         │
        │                                     │
        │                                     ▼
        │                            ┌────────────────┐
        │                            │ Naver Commerce │
        │                            │      API       │
        │                            └────────────────┘
        │
        └─────────────────┐
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌────────────────┐                 ┌────────────────┐
│ External APIs  │                 │  Supabase      │
│ - Solapi (SMS) │                 │  Storage       │
│ - Kakao (OAuth)│                 └────────────────┘
│ - Gemini (AI)  │
│ - Toss (Pay)   │
└────────────────┘
```

### 의존성 설명

| 서비스 | 의존 대상 | 용도 |
|--------|----------|------|
| **Customer** | @sundayhug/* packages | UI, DB, 공통 유틸 |
| | Naver Proxy | 주문/재고 조회 (고정 IP 필요) |
| | Supabase | 인증, DB, 파일 저장소 |
| | Solapi | SMS OTP, 알림톡 |
| | Kakao, Google | OAuth 소셜 로그인 |
| | Gemini | AI 육아 상담 |
| | Toss Payments | 결제 처리 |
| **Dashboard** | @sundayhug/* packages | UI, DB, 공통 유틸 |
| | Naver Proxy | 주문 동기화, 재고 관리 |
| | Supabase | 관리자 DB |
| **Mobile** | @sundayhug/* packages | UI, DB, 공통 유틸 |
| | Supabase | 모바일 인증, DB |
| **Naver Proxy** | Naver Commerce API | 고정 IP 우회 프록시 |

---

## 공유 패키지 패턴

### 1. @sundayhug/ui

**목적:** 앱 간 공통 UI 컴포넌트 공유

**구조:**
```typescript
// packages/ui/src/components/button.tsx
export { Button } from "./button";
export { Dialog, DialogTrigger, DialogContent } from "./dialog";
export { Input } from "./input";
```

**사용 예시:**
```typescript
// apps/customer/app/features/auth/components/login-form.tsx
import { Button, Input } from "@sundayhug/ui/components/button";
import { Dialog } from "@sundayhug/ui/components/dialog";

export function LoginForm() {
  return (
    <Dialog>
      <Input placeholder="이메일" />
      <Button>로그인</Button>
    </Dialog>
  );
}
```

**특징:**
- Radix UI 기반 (Headless UI)
- Tailwind CSS + CVA (Class Variance Authority)
- 앱별 테마 커스터마이징 가능

---

### 2. @sundayhug/database

**목적:** Supabase 클라이언트 중앙화 관리

**구조:**
```typescript
// packages/database/src/client.server.ts
import { createServerClient } from "@supabase/ssr";

export function getSupabaseClient(request: Request) {
  return createServerClient(/* ... */);
}

// packages/database/src/admin.server.ts
export function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

// packages/database/src/types.ts
export type Database = /* Supabase 자동 생성 타입 */;
```

**사용 예시:**
```typescript
// apps/customer/app/features/auth/queries.ts
import { getSupabaseClient } from "@sundayhug/database/client";

export async function getUserSession(request: Request) {
  const supabase = getSupabaseClient(request);
  const { data } = await supabase.auth.getSession();
  return data.session;
}
```

**특징:**
- SSR 지원 (Cookie 기반 세션)
- 타입 안전성 (Supabase CLI 타입 생성)
- 클라이언트/관리자 분리

---

### 3. @sundayhug/shared

**목적:** 공통 유틸리티 함수 및 타입 공유

**구조:**
```typescript
// packages/shared/src/lib/format.ts
export function formatPhoneNumber(phone: string) { /* ... */ }
export function formatDate(date: Date) { /* ... */ }

// packages/shared/src/lib/validation.ts
export const phoneSchema = z.string().regex(/^010\d{8}$/);
export const emailSchema = z.string().email();
```

**사용 예시:**
```typescript
// apps/customer/app/features/auth/lib/validate-phone.ts
import { phoneSchema } from "@sundayhug/shared/lib/validation";

export function validatePhone(phone: string) {
  return phoneSchema.safeParse(phone);
}
```

**특징:**
- Zod 스키마 공유
- i18next 설정 공유
- 범용 유틸리티 함수

---

## 환경 변수 관계

### 환경 변수 맵

| 변수명 | Customer | Dashboard | Mobile | Naver Proxy | 용도 |
|--------|----------|-----------|--------|-------------|------|
| `SUPABASE_URL` | ✅ | ✅ | ✅ | ❌ | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | ❌ | 클라이언트 인증 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ❌ | ❌ | 관리자 권한 키 (서버만) |
| `KAKAO_CLIENT_ID` | ✅ | ❌ | ❌ | ❌ | 카카오 OAuth |
| `KAKAO_CLIENT_SECRET` | ✅ | ❌ | ❌ | ❌ | 카카오 OAuth |
| `GOOGLE_CLIENT_ID` | ✅ | ❌ | ❌ | ❌ | 구글 OAuth |
| `GOOGLE_CLIENT_SECRET` | ✅ | ❌ | ❌ | ❌ | 구글 OAuth |
| `GEMINI_API_KEY` | ✅ | ✅ | ❌ | ❌ | AI 상담 (Gemini) |
| `SOLAPI_API_KEY` | ✅ | ❌ | ❌ | ❌ | SMS OTP |
| `SOLAPI_API_SECRET` | ✅ | ❌ | ❌ | ❌ | SMS OTP |
| `TOSS_CLIENT_KEY` | ✅ | ❌ | ❌ | ❌ | 토스 결제 |
| `TOSS_SECRET_KEY` | ✅ | ❌ | ❌ | ❌ | 토스 결제 |
| `NAVER_PROXY_URL` | ✅ | ✅ | ❌ | ❌ | Naver Proxy 엔드포인트 |
| `NAVER_PROXY_API_KEY` | ✅ | ✅ | ❌ | ❌ | Proxy 인증 키 |
| `NAVER_CLIENT_ID` | ❌ | ❌ | ❌ | ✅ | 네이버 커머스 API |
| `NAVER_CLIENT_SECRET` | ❌ | ❌ | ❌ | ✅ | 네이버 커머스 API |
| `SENTRY_DSN` | ✅ | ✅ | ❌ | ❌ | 에러 트래킹 |

### 환경 변수 설정 위치

**개발 환경:**
```bash
# 각 앱 루트에 .env 파일
apps/customer/.env
apps/dashboard/.env
apps/mobile/.env
naver-proxy/.env
```

**프로덕션 환경:**
- **Vercel:** 프로젝트 설정 → Environment Variables
- **Railway:** 서비스 설정 → Variables
- **Expo (Mobile):** `eas.json` → `env` 설정

---

## 배포 토폴로지

```
┌─────────────────────────────────────────────────────────┐
│                   Vercel (Edge Network)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────┐      ┌────────────────────┐   │
│  │ app.sundayhug.kr   │      │ admin.sundayhug.kr │   │
│  │ (Customer App)     │      │ (Dashboard)        │   │
│  │                    │      │                    │   │
│  │ - React Router 7   │      │ - React Router 7   │   │
│  │ - SSR + Edge       │      │ - SSR + Edge       │   │
│  │ - Auto Scaling     │      │ - Auto Scaling     │   │
│  └────────┬───────────┘      └────────┬───────────┘   │
│           │                           │               │
└───────────┼───────────────────────────┼───────────────┘
            │                           │
            └───────────┬───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Supabase   │ │   Railway    │ │ External APIs│
│  (Database)  │ │ (Naver Proxy)│ │              │
│              │ │              │ │ - Solapi     │
│ - PostgreSQL │ │ - Express.js │ │ - Kakao      │
│ - Auth       │ │ - Fixed IP   │ │ - Gemini     │
│ - Storage    │ │ - CORS Proxy │ │ - Toss       │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 배포 설정

#### Vercel (Customer & Dashboard)

**프로젝트 설정:**
```json
// vercel.json (apps/customer)
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": null,
  "outputDirectory": "build/client"
}
```

**배포 흐름:**
1. GitHub Push → main 브랜치
2. Vercel 자동 빌드 트리거
3. Turborepo 캐싱으로 빠른 빌드
4. Edge Network 배포 (전 세계 CDN)
5. Zero-downtime 배포

**도메인:**
- Customer: `app.sundayhug.kr`
- Dashboard: `admin.sundayhug.kr`

---

#### Railway (Naver Proxy)

**설정:**
```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**특징:**
- **고정 IP:** 네이버 커머스 API 화이트리스트용
- **자동 재시작:** 장애 시 자동 복구
- **헬스체크:** `/health` 엔드포인트

---

## 데이터 플로우

### 1. 고객 앱 → Supabase (인증 플로우)

```
┌─────────────┐
│   Customer  │
│   Browser   │
└──────┬──────┘
       │ 1. POST /api/auth/login
       ▼
┌─────────────────┐
│ Customer Server │
│ (React Router)  │
└──────┬──────────┘
       │ 2. supabase.auth.signInWithOtp()
       ▼
┌─────────────────┐
│    Supabase     │
│      Auth       │
└──────┬──────────┘
       │ 3. Send OTP via Solapi
       ▼
┌─────────────────┐
│  User's Phone   │
└─────────────────┘
```

### 2. 고객 앱 → Naver Proxy (주문 조회 플로우)

```
┌─────────────┐
│   Customer  │
│   Browser   │
└──────┬──────┘
       │ 1. GET /api/orders/{orderId}
       ▼
┌─────────────────┐
│ Customer Server │
└──────┬──────────┘
       │ 2. GET https://naver-proxy.railway.app/orders/{orderId}
       │    Headers: { "X-API-Key": "..." }
       ▼
┌─────────────────┐
│  Naver Proxy    │
│  (Railway)      │
└──────┬──────────┘
       │ 3. GET https://api.commerce.naver.com/orders/{orderId}
       │    Headers: { "X-Naver-Client-Id", "X-Naver-Client-Secret" }
       ▼
┌─────────────────┐
│ Naver Commerce  │
│      API        │
└──────┬──────────┘
       │ 4. Response
       ▼
      ...
```

### 3. Dashboard → Supabase (보증서 승인 플로우)

```
┌─────────────┐
│  Dashboard  │
│   Browser   │
└──────┬──────┘
       │ 1. POST /api/warranty/approve
       ▼
┌─────────────────┐
│ Dashboard Server│
└──────┬──────────┘
       │ 2. UPDATE warranties SET status = 'approved'
       ▼
┌─────────────────┐
│    Supabase     │
│      DB         │
└──────┬──────────┘
       │ 3. Trigger: warranty_approval_notification
       ▼
┌─────────────────┐
│ Edge Function   │
│ (Notification)  │
└──────┬──────────┘
       │ 4. Send Alimtalk via Solapi
       ▼
┌─────────────────┐
│  User's Phone   │
└─────────────────┘
```

### 4. Feature 간 데이터 공유 (Customer App 내부)

```
[Auth Feature]
      │
      │ export { getUserSession } from "./queries"
      ▼
[Auth Feature index.ts] ← 공개 API
      │
      │ import { getUserSession } from "~/features/auth"
      ▼
[Warranty Feature]
      │
      │ const session = await getUserSession(request)
      │ if (!session) throw redirect("/login")
      ▼
[Warranty Queries]
```

**규칙:**
- Feature 간 직접 import 금지
- 반드시 `index.ts`를 통한 공개 API만 사용
- 타입과 쿼리 함수만 export

---

## 기술 스택 개요

### Frontend

| 기술 | 버전 | 용도 | 적용 앱 |
|------|------|------|---------|
| **React** | 19.0 | UI 프레임워크 | Customer, Dashboard |
| **React Router** | 7.5 | SSR 프레임워크 | Customer, Dashboard |
| **React Native** | - | 모바일 프레임워크 | Mobile |
| **Tailwind CSS** | 4.0 | CSS 프레임워크 | All |
| **Radix UI** | 1.x | Headless UI | All |
| **Lucide React** | 0.482 | 아이콘 | All |
| **i18next** | 24.2 | 다국어 지원 | All |
| **Zod** | 3.24 | 스키마 검증 | All |

### Backend & Database

| 기술 | 버전 | 용도 |
|------|------|------|
| **Supabase** | 2.49 | BaaS (Auth, DB, Storage) |
| **PostgreSQL** | 15 | 관계형 DB (Supabase) |
| **Drizzle ORM** | 0.40 | TypeScript ORM |
| **Express.js** | 4.18 | Naver Proxy 서버 |

### Infrastructure

| 기술 | 용도 |
|------|------|
| **Turborepo** | 모노레포 빌드 시스템 |
| **Vercel** | Customer & Dashboard 배포 |
| **Railway** | Naver Proxy 배포 (고정 IP) |
| **npm Workspaces** | 패키지 관리 |

### External Services

| 서비스 | 용도 |
|--------|------|
| **Solapi** | SMS OTP, 알림톡 발송 |
| **Kakao** | 소셜 로그인 (OAuth) |
| **Google** | 소셜 로그인 (OAuth) |
| **Gemini** | AI 육아 상담 |
| **Toss Payments** | 결제 처리 |
| **Naver Commerce** | 주문/재고 조회 |
| **Sentry** | 에러 트래킹 |

### Development Tools

| 도구 | 용도 |
|------|------|
| **TypeScript** | 5.7 - 타입 안전성 |
| **Prettier** | 코드 포매팅 |
| **ESLint** | 코드 린팅 |
| **Playwright** | E2E 테스트 |
| **Drizzle Kit** | DB 마이그레이션 |

---

## 개발 워크플로우

### 1. 프로젝트 설정

```bash
# 저장소 클론
git clone https://github.com/your-org/sundayhug-app.git
cd sundayhug-app

# 의존성 설치 (모든 워크스페이스)
npm install

# 환경 변수 설정
cp apps/customer/.env.example apps/customer/.env
cp apps/dashboard/.env.example apps/dashboard/.env

# Supabase 타입 생성
cd apps/customer
npm run db:typegen
```

### 2. 개발 서버 실행

```bash
# 전체 앱 동시 실행 (병렬)
npm run dev

# 특정 앱만 실행
npm run dev:customer   # localhost:3000
npm run dev:dashboard  # localhost:3001

# Turborepo 캐싱 활용
# - 변경된 패키지만 재빌드
# - 의존성 그래프 자동 해석
```

### 3. Feature 개발 워크플로우

#### Customer 앱에 새 Feature 추가

```bash
# 1. Feature 디렉토리 생성
mkdir -p apps/customer/app/features/new-feature

# 2. 필수 파일 생성
cd apps/customer/app/features/new-feature
touch index.ts manifest.ts types.ts schema.ts queries.ts

# 3. manifest.ts 작성
cat > manifest.ts << 'EOF'
export const manifest = {
  name: "new-feature",
  description: "새 기능 설명",
  featureDependencies: [],
  sharedDependencies: ["notification"],
  routes: ["/api/new-feature/*"],
  tables: ["new_feature_table"],
} as const;
EOF

# 4. index.ts 작성 (공개 API만 export)
cat > index.ts << 'EOF'
export type { NewFeatureType } from "./types";
export { getNewFeatureById } from "./queries";
EOF
```

#### 의존성 규칙 체크

```typescript
// ✅ 올바른 import
import { sendSmsOTP } from "~/shared/services/notification";
import { Button } from "~/core/components/ui/button";
import { getWarrantyById } from "~/features/warranty"; // index.ts를 통한 공개 API

// ❌ 잘못된 import
import { internalHelper } from "~/features/warranty/lib/internal"; // 직접 접근 금지
import { WarrantySchema } from "~/features/warranty/schema"; // 스키마 내부 금지
```

### 4. 패키지 업데이트

```bash
# @sundayhug/ui에 새 컴포넌트 추가
cd packages/ui/src/components
touch new-component.tsx

# 컴포넌트 작성 후 export
echo 'export { NewComponent } from "./new-component";' >> ../index.ts

# 타입 체크
npm run typecheck

# 이 패키지를 사용하는 앱이 자동 재빌드됨 (Turborepo)
```

### 5. 데이터베이스 마이그레이션

```bash
# Supabase Studio에서 테이블 생성
# https://app.supabase.com/project/ugzwgegkvxcczwiottej/editor

# 타입 자동 생성
cd apps/customer
npm run db:typegen

# Drizzle 스키마 작성
cat > app/features/new-feature/schema.ts << 'EOF'
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const newFeatureTable = pgTable("new_feature_table", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
});
EOF

# 마이그레이션 생성
npm run db:generate

# 마이그레이션 적용
npm run db:migrate
```

### 6. 테스트

```bash
# E2E 테스트 실행 (Playwright)
cd apps/customer
npm run test:e2e

# UI 모드로 디버깅
npm run test:e2e:ui

# 특정 테스트만 실행
npx playwright test auth.spec.ts
```

### 7. 빌드 및 배포

```bash
# 로컬 빌드 (전체 모노레포)
npm run build

# 타입 체크
npm run typecheck

# 린트
npm run lint

# 프로덕션 배포 (Vercel)
# - main 브랜치에 푸시하면 자동 배포
git add .
git commit -m "feat: add new feature"
git push origin main

# Naver Proxy 배포 (Railway)
# - naver-proxy/ 디렉토리 변경 감지 시 자동 배포
```

### 8. AI 에이전트 병렬 개발 (권장)

**격리된 Feature 그룹:**

| 그룹 | Features | 병렬 개발 가능 여부 | 비고 |
|------|----------|---------------------|------|
| A | sleep-analysis, sleep-forecast | ✅ 높음 | 독립적, 의존성 없음 |
| B | chat, baby-reels | ✅ 높음 | 독립적, 의존성 없음 |
| C | warranty, payments | ✅ 중간 | notification 공유 사용 |
| D | auth | ⚠️ 낮음 | 다른 Feature가 의존 |

**병렬 개발 예시:**
```bash
# Agent 1: sleep-analysis 개발
# Agent 2: chat 개발
# Agent 3: baby-reels 개발

# 충돌 없음 → 동시 머지 가능
```

---

## 모범 사례 (Best Practices)

### 1. Feature 격리 유지

- ✅ 각 Feature는 독립적인 bounded context
- ✅ `manifest.ts`에 의존성 명시
- ❌ Feature 간 직접 파일 import 금지

### 2. 공유 서비스 활용

```typescript
// ✅ 공유 서비스 재사용
import { sendSmsOTP } from "~/shared/services/notification";

// ❌ 직접 구현 금지
async function sendSms() {
  await fetch("https://api.solapi.com/..."); // 중복 코드
}
```

### 3. 타입 안전성

```typescript
// ✅ Zod 스키마로 런타임 검증
import { z } from "zod";
const schema = z.object({ phone: z.string() });
const result = schema.safeParse(data);

// ❌ 타입만 선언 (런타임 오류 가능)
interface Data { phone: string }
const data: Data = JSON.parse(input); // 위험
```

### 4. 환경 변수 관리

```typescript
// ✅ 서버에서만 사용
import { SUPABASE_SERVICE_ROLE_KEY } from "~/core/lib/env.server";

// ❌ 클라이언트 노출 금지
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // 빌드 타임에 번들에 포함됨
```

### 5. 파일 크기 제한

- Screen 파일: 최대 400줄
- Component 파일: 최대 200줄
- 초과 시 하위 컴포넌트로 분할

---

## 참고 자료

- [Customer App 아키텍처](./apps/customer/ARCHITECTURE.md)
- [Turborepo 문서](https://turbo.build/repo/docs)
- [React Router 7 가이드](https://reactrouter.com/en/main)
- [Supabase 문서](https://supabase.com/docs)
- [Drizzle ORM 문서](https://orm.drizzle.team/docs/overview)

---

## 문의

아키텍처 관련 질문이나 제안사항은 팀 리드에게 문의하세요.
