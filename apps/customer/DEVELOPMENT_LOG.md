# 썬데이허그 고객 앱 (Customer App) 개발 일지

## 프로젝트 정보
- **앱 이름**: @sundayhug/customer
- **도메인**: app.sundayhug.com
- **Vercel 프로젝트**: sundayhug-customer
- **GitHub**: https://github.com/inkyojay/sundayhug-app (apps/customer)
- **Supabase**: JAYCORP 프로젝트 (ugzwgegkvxcczwiottej)

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
   - Root Directory: `apps/customer`

3. **누락 패키지 추가**
   - `openai` - AI 채팅 기능용
   - `@google/generative-ai` - Gemini API용

### 환경변수
```
SUPABASE_URL=https://ugzwgegkvxcczwiottej.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SITE_URL=https://app.sundayhug.com
GEMINI_API_KEY=...
KAKAO_CLIENT_ID=2737860d151daba73e31d3df6213a012
KAKAO_CLIENT_SECRET=HexFevCinjno2w3zvLIMtE0lUos1gk5Q
VITE_KAKAO_JAVASCRIPT_KEY=4a215fb45569a16077443a78541f90a3
```

### 주요 기능
- 카카오 로그인 (REST API 직접 호출 방식)
- 보증서 등록/조회
- 수면 분석 (AI)
- AI 육아 상담 (서비스 준비중)
- 후기 이벤트 참여

### 파일 구조
```
apps/customer/
├── app/
│   ├── features/
│   │   ├── customer/     # 고객 전용 화면
│   │   ├── warranty/     # 보증서 관련
│   │   ├── sleep-analysis/  # 수면 분석
│   │   ├── chat/         # AI 상담
│   │   └── blog/         # 블로그
│   ├── core/             # 공통 컴포넌트
│   └── routes.ts         # 고객 앱 라우트
├── package.json
└── react-router.config.ts
```

---

## 배포 체크리스트
- [ ] Vercel Framework Preset: React Router
- [ ] Output Directory Override: OFF
- [ ] 환경변수 설정 완료
- [ ] 도메인 연결 (app.sundayhug.com)

---

## 이전 기록
- 2025-12-07: 카카오 로그인 구현, 수면 분석 이미지 저장 기능
- 2025-12-06: 다크모드 개선, 후기 인증 대시보드 개선

