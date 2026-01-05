# Customer App Architecture

AI 에이전트 병렬 개발을 위한 아키텍처 가이드

## 디렉토리 구조

```
app/
├── core/                    # 인프라 레이어
│   ├── components/ui/       # Atomic UI 컴포넌트 (shadcn/ui)
│   ├── db/                  # 데이터베이스 인프라
│   ├── lib/                 # 핵심 유틸리티 (auth, i18n, etc.)
│   ├── layouts/             # 앱 레이아웃
│   └── hooks/               # 공유 React 훅
│
├── shared/                  # 공유 커널
│   └── services/            # 공유 서비스
│       ├── notification/    # SMS/알림톡 서비스
│       └── storage/         # 파일 저장소 서비스
│
└── features/                # 기능 모듈 (격리됨)
    ├── auth/                # 인증
    ├── sleep-analysis/      # 수면 분석
    ├── warranty/            # 보증서 관리
    ├── chat/                # AI 상담
    ├── payments/            # 결제
    ├── users/               # 사용자 관리
    ├── customer/            # 고객 허브
    └── blog/                # 블로그
```

## 의존성 방향

```
[Features] ──→ [Shared] ──→ [Core]
```

- **Feature → Feature**: 금지 (index.ts를 통한 타입만 허용)
- **Feature → Shared**: 허용
- **Feature → Core**: 허용
- **Shared → Core**: 허용
- **Core → Feature**: 금지
- **Shared → Feature**: 금지

## Feature 구조 표준

각 Feature는 다음 구조를 따릅니다:

```
feature-name/
├── index.ts          # [필수] 공개 API (barrel file)
├── manifest.ts       # [필수] 모듈 메타데이터
├── types.ts          # [필수] 타입 정의
├── schema.ts         # DB 스키마 (Drizzle)
├── queries.ts        # DB 쿼리 함수
├── api/              # API 라우트 핸들러
├── components/       # Feature 전용 컴포넌트
├── screens/          # 페이지 컴포넌트
├── lib/              # 비즈니스 로직
└── hooks/            # Feature 전용 훅
```

### index.ts 작성 규칙

```typescript
// feature/index.ts

// 공개 타입만 export
export type { PublicType } from "./types";

// 다른 feature에서 필요한 쿼리만 export
export { getById } from "./queries";

// 공개 컴포넌트 (필요시)
export { PublicComponent } from "./components/public-component";

// 절대 export 금지:
// - 내부 lib 함수
// - 비공개 컴포넌트
// - 스키마 내부
```

### manifest.ts 작성 규칙

```typescript
export const manifest = {
  name: "feature-name",
  description: "기능 설명",
  featureDependencies: [],      // 다른 feature 의존성
  sharedDependencies: ["notification"], // shared 의존성
  routes: ["/api/feature/*"],   // 소유 라우트
  tables: ["feature_table"],    // 소유 테이블
} as const;
```

## AI 에이전트 개발 규칙

### 1. Feature 격리

- 각 Feature는 독립적인 bounded context
- 다른 Feature의 내부 파일 직접 import 금지
- 필요시 index.ts를 통한 공개 API만 사용

### 2. 파일 크기 제한

- Screen 파일: 최대 400줄
- Component 파일: 최대 200줄
- 초과시 하위 컴포넌트로 분할

### 3. Import 규칙

```typescript
// 올바른 import
import { sendSmsOTP } from "~/shared/services/notification";
import { uploadToStorage } from "~/shared/services/storage";
import { SleepAnalysis } from "~/features/sleep-analysis";
import { Button } from "~/core/components/ui/button";

// 잘못된 import (금지)
import { internalFunc } from "~/features/other/lib/internal";
```

### 4. 병렬 개발 가능 Feature 그룹

| 그룹 | Features | 격리 수준 | 비고 |
|------|----------|----------|------|
| A | sleep-analysis, sleep-forecast | 높음 | 독립적 |
| B | chat, baby-reels | 높음 | 독립적 |
| C | warranty | 중간 | notification 사용 |
| D | auth | 중간 | notification 제공 |
| E | payments, users | 높음 | 독립적 |
| F | blog, customer | 낮음 | UI 중심 |

### 5. 새 Feature 추가시

1. `features/new-feature/` 디렉토리 생성
2. `index.ts`, `manifest.ts`, `types.ts` 필수 생성
3. 라우트 추가 (`routes.ts`)
4. 다른 Feature import 최소화

## 공유 서비스 사용

### Notification Service

```typescript
import {
  sendSmsOTP,
  sendWarrantyApprovalAlimtalk
} from "~/shared/services/notification";

// OTP 발송
await sendSmsOTP("01012345678", "123456");

// 보증서 승인 알림
await sendWarrantyApprovalAlimtalk("01012345678", {
  customerName: "홍길동",
  productName: "제품명",
  warrantyNumber: "W-001",
  startDate: "2024-01-01",
  endDate: "2025-01-01",
});
```

### Storage Service

```typescript
import {
  uploadToStorage,
  downloadFromUrl
} from "~/shared/services/storage";

// 파일 업로드
const result = await uploadToStorage(supabase, buffer, {
  bucket: "images",
  fileName: "photo.jpg",
  mimeType: "image/jpeg",
});

// URL에서 다운로드
const { buffer, contentType } = await downloadFromUrl(imageUrl);
```

## 데이터베이스 규칙

### 테이블 소유권

- 각 테이블은 하나의 Feature만 소유
- `manifest.ts`의 `tables` 배열에 명시
- RLS 정책은 해당 Feature에서 관리

### 스키마 위치

- Feature 전용 테이블: `features/xxx/schema.ts`
- 공유 테이블: `core/db/` 또는 Supabase 마이그레이션

## 라우팅 규칙

- API 라우트: `/api/{feature}/*`
- 페이지 라우트: `/customer/{feature}/*`
- `routes.ts`에서 중앙 관리
- `manifest.ts`에 소유 라우트 명시

## 코드 스타일

### 컴포넌트 작명

- 페이지: `{name}.tsx` (소문자, 하이픈)
- 컴포넌트: `{Name}.tsx` (PascalCase)
- 훅: `use-{name}.ts` (소문자, 하이픈)
- 유틸: `{name}.server.ts` (서버), `{name}.client.ts` (클라이언트)

### 타입 정의

- 인터페이스 사용 권장
- PascalCase 네이밍
- export type 사용
