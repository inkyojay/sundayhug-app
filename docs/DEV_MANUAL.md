# 🛠️ 썬데이허그 앱 개발 매뉴얼

> 집에서 맥북으로 이어서 작업할 때 참고하세요!

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [개발 환경 설정](#개발-환경-설정)
3. [브랜치 전략](#브랜치-전략)
4. [개발 워크플로우](#개발-워크플로우)
5. [주요 파일 구조](#주요-파일-구조)
6. [최근 작업 내역](#최근-작업-내역)
7. [자주 사용하는 명령어](#자주-사용하는-명령어)

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **GitHub** | `inkyojay/sundayhug-app` |
| **Vercel** | `app-sundayhug-members` |
| **프로덕션 URL** | https://app.sundayhug.com |
| **개발 Preview** | https://app-sundayhug-members-git-develop-inkyos-projects.vercel.app |

### 주요 기능
- 🏷️ **디지털 보증서**: 제품 정품 인증 및 A/S 관리
- 🌙 **수면 분석**: AI 기반 아기 수면 환경 분석 (Gemini AI)
- 💬 **AI 육아 상담**: RAG 기반 육아 상담 챗봇
- 📦 **주문 관리**: PlayAuto 연동 주문/재고 동기화

---

## 개발 환경 설정

### 1. 저장소 클론
```bash
git clone https://github.com/inkyojay/sundayhug-app.git
cd sundayhug-app
```

### 2. 의존성 설치
```bash
cd supaplate-master
npm install
```

### 3. 환경 변수 설정
`supaplate-master/.env` 파일 생성:

```env
# 사이트 URL
SITE_URL="http://localhost:3000"

# Supabase
SUPABASE_URL="https://ugzwgegkvxcczwiottej.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
DATABASE_URL="postgresql://postgres.ugzwgegkvxcczwiottej:...@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

# Google Gemini AI
GEMINI_API_KEY="AIzaSy..."

# 카카오 로그인
KAKAO_CLIENT_ID="7474843a05c3daf50d1253676e6badbd"
KAKAO_REDIRECT_URI="http://localhost:3000/customer/auth/callback"

# 네이버 로그인
NAVER_CLIENT_ID="vg2MoKtr_rnX60RKdUKi"
NAVER_CLIENT_SECRET="JdHjpNFM4C"

# Solapi (SMS/알림톡)
SOLAPI_API_KEY="NCSLC95I2UYGLZWY"
SOLAPI_API_SECRET="VGNU1DGCHY1HTGP12XDRAZILLBGNANFB"
SOLAPI_PF_ID="KA01PF23042615382308323ou8Ro12HU"
SOLAPI_SENDER_NUMBER="15339093"

# Google TTS
GOOGLE_TTS_API_KEY="AIzaSy..."
```

### 4. 로컬 서버 실행
```bash
cd supaplate-master
npm run dev
```
→ http://localhost:3000 에서 확인

---

## 브랜치 전략

| 브랜치 | 용도 | 배포 URL |
|--------|------|----------|
| `main` | 프로덕션 (보증서만) | https://app.sundayhug.com |
| `develop` | 개발 (전체 기능) | Vercel Preview URL |

### main에서 비활성화된 기능
- 수면 분석 API (`/customer/sleep/*`)
- AI 육아 상담 (`/customer/chat/*`)
- 마이페이지 수면 분석 이력

---

## 개발 워크플로우

### 1. develop 브랜치로 전환
```bash
git checkout develop
git pull origin develop
```

### 2. 로컬에서 개발 & 테스트
```bash
cd supaplate-master
npm run dev
# http://localhost:3000 에서 테스트
```

### 3. 커밋 & 푸시
```bash
git add -A
git commit -m "feat: 기능 설명"
git push origin develop
```

### GitHub 인증 (토큰 방식)
```bash
# 토큰 생성: https://github.com/settings/tokens/new?type=classic
# repo 권한 체크 필요

git remote set-url origin https://inkyojay:YOUR_TOKEN@github.com/inkyojay/sundayhug-app.git
git push origin develop

# 푸시 후 토큰 제거 (보안)
git remote set-url origin https://github.com/inkyojay/sundayhug-app.git
```

### 4. Vercel Preview 확인
푸시 후 자동 배포됨:
→ https://app-sundayhug-members-git-develop-inkyos-projects.vercel.app

---

## 주요 파일 구조

```
sundayhug-app/
├── docs/                          # 문서
├── supabase/
│   ├── functions/                 # Edge Functions (Deno)
│   │   ├── sync-orders/          # 주문 동기화
│   │   └── sync-inventory/       # 재고 동기화
│   └── migrations/               # DB 마이그레이션
└── supaplate-master/
    └── app/
        ├── routes.ts             # 라우팅 설정
        ├── core/                 # 공통 컴포넌트, 유틸
        │   ├── components/ui/    # shadcn/ui 컴포넌트
        │   └── lib/              # Supabase 클라이언트 등
        └── features/
            ├── customer/         # 고객 페이지
            │   └── screens/
            │       ├── mypage/   # 마이페이지
            │       └── sleep-hub.tsx
            ├── warranty/         # 보증서 (고객/관리자)
            ├── sleep-analysis/   # 수면 분석
            ├── chat/             # AI 육아 상담
            ├── orders/           # 주문 관리
            └── blog/             # 블로그
```

### 주요 파일 설명

| 파일 | 설명 |
|------|------|
| `routes.ts` | 전체 라우팅 설정 |
| `supa-client.server.ts` | Supabase 클라이언트 (anon key) |
| `supa-admin-client.server.ts` | Supabase Admin 클라이언트 (service role) |
| `warranty/screens/public/register.tsx` | 보증서 등록 페이지 |
| `mypage/warranties.tsx` | 내 보증서 목록 |
| `mypage/as-list.tsx` | A/S 신청 페이지 |
| `sleep-analysis/screens/result.tsx` | 수면 분석 결과 |

---

## 최근 작업 내역

### 2025-12-02

#### 대시보드 (관리자)
- **주문 동기화**: 배치 처리(500개 단위)로 성능 개선
- **보증서 관리**: 체크박스 선택 삭제 기능 추가

#### 고객 페이지
- **보증서 등록**: 입력 필드/버튼 UI 가시성 개선
- **마이페이지**: 정품 인증 섹션 제거
- **내 보증서**: `user_id` 기반 조회로 변경
- **보증서 상세**: UI 밝게 개선
- **A/S 신청**: 제품 선택(ABC침대/다른제품) + 사진 첨부 기능
- **수면 분석 결과**: Drizzle → Supabase 클라이언트로 변경, 에러 수정
- **수면 분석 이력**: 썸네일 제거, JSON summary 파싱

---

## 자주 사용하는 명령어

### 로컬 개발
```bash
cd supaplate-master
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run lint         # 린트 체크
```

### Git
```bash
git status                    # 변경 파일 확인
git diff                      # 변경 내용 확인
git checkout develop          # develop 브랜치로 전환
git pull origin develop       # 최신 코드 받기
git add -A                    # 모든 변경 스테이징
git commit -m "메시지"         # 커밋
git push origin develop       # 푸시
```

### Supabase
```bash
# Edge Function 배포
supabase functions deploy sync-orders --project-ref ugzwgegkvxcczwiottej

# DB 마이그레이션
supabase db push --project-ref ugzwgegkvxcczwiottej
```

---

## 트러블슈팅

### GitHub 푸시 인증 오류
```
fatal: Authentication failed
```
→ Personal Access Token 필요: https://github.com/settings/tokens/new?type=classic

### Supabase "Tenant or user not found"
→ Drizzle ORM 대신 Supabase 클라이언트 사용

### 보증서 삭제 안 됨 (RLS)
→ `adminClient` 사용 (service role key)

---

## 참고 링크

- [Supabase 대시보드](https://supabase.com/dashboard/project/ugzwgegkvxcczwiottej)
- [Vercel 대시보드](https://vercel.com/inkyos-projects/app-sundayhug-members)
- [GitHub 저장소](https://github.com/inkyojay/sundayhug-app)
- [카카오 개발자](https://developers.kakao.com)

---

*마지막 업데이트: 2025-12-02*

