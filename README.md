# 썬데이허그 앱 (Monorepo)

Turborepo를 활용한 모노레포 구조로, 고객 앱과 관리자 대시보드가 분리되어 있습니다.

## 📦 구조

```
sundayhug-app/
├── apps/
│   ├── customer/        # 고객 앱 (app.sundayhug.kr)
│   └── dashboard/       # 관리자 대시보드 (admin.sundayhug.kr)
├── packages/
│   ├── ui/              # 공통 UI 컴포넌트
│   ├── database/        # Supabase 클라이언트
│   └── shared/          # 공통 유틸/타입
├── turbo.json
└── package.json
```

## 🚀 시작하기

### 설치

```bash
npm install
```

### 개발 서버

```bash
# 전체 앱 실행
npm run dev

# 고객 앱만 실행 (포트 3000)
npm run dev:customer

# 대시보드만 실행 (포트 3001)
npm run dev:dashboard
```

### 빌드

```bash
npm run build
```

## 🌐 배포

### Vercel 설정

각 앱을 별도의 Vercel 프로젝트로 배포합니다:

1. **고객 앱**: `apps/customer` → app.sundayhug.kr
2. **대시보드**: `apps/dashboard` → admin.sundayhug.kr

### 환경 변수

각 앱에 동일한 환경 변수를 설정합니다:

```env
SUPABASE_URL=https://ugzwgegkvxcczwiottej.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
GEMINI_API_KEY=your_gemini_key
```

## 📱 앱 기능

### Customer (고객 앱)
- 디지털 보증서 등록/조회
- 수면 환경 분석기
- AI 육아 상담
- 후기 이벤트 참여
- 마이페이지

### Dashboard (관리자)
- 제품/재고/주문 관리
- 보증서 승인/관리
- 수면 분석 이력 관리
- 블로그/AI 상담 지식 관리
- 후기 이벤트 관리

