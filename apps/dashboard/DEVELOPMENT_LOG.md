# 썬데이허그 관리자 대시보드 (Dashboard App) 개발 일지

## 프로젝트 정보
- **앱 이름**: @sundayhug/dashboard
- **도메인**: admin.sundayhug.com
- **Vercel 프로젝트**: sundayhug-dashboard
- **GitHub**: https://github.com/inkyojay/sundayhug-app (apps/dashboard)
- **Supabase**: JAYCORP 프로젝트 (ugzwgegkvxcczwiottej) - 고객 앱과 공유

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


