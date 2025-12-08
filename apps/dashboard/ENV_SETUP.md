# 🔧 환경 변수 설정 가이드

## 썬데이허그 통합 앱 환경변수

## 1단계: .env 파일 생성

```bash
cd supaplate-master
touch .env
```

## 2단계: .env 파일에 아래 내용 복사

```env
# ============================================
# 썬데이허그 통합 앱 환경 변수
# 업데이트: 2025-12-01
# ============================================

# 앱 기본 설정
VITE_APP_NAME="Sundayhug"
VITE_APP_URL="http://localhost:5173"

# ============================================
# Supabase 설정 (필수)
# ============================================
SUPABASE_URL="https://ugzwgegkvxcczwiottej.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnendnZWdrdnhjY3p3aW90dGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTI2NzAsImV4cCI6MjA3NzI4ODY3MH0._ezV2r8kAvjIlovx6U_L0XzW9nWtSR0MY-RpMISPK38"
SUPABASE_SERVICE_ROLE_KEY="여기에_service_role_key_입력"

# Drizzle ORM용 데이터베이스 URL (아래 3단계 참고)
DATABASE_URL="여기에_입력"

# ============================================
# Solapi (SMS/알림톡) 설정
# ============================================
SOLAPI_API_KEY="여기에_입력"
SOLAPI_API_SECRET="여기에_입력"
SOLAPI_PF_ID="여기에_카카오_채널_ID_입력"
SOLAPI_TEMPLATE_ID="여기에_알림톡_템플릿_ID_입력"
SOLAPI_SENDER_NUMBER="15339093"

# ============================================
# 카카오 로그인 설정
# ============================================
KAKAO_CLIENT_ID="7474843a05c3daf50d1253676e6badbd"
KAKAO_REDIRECT_URI="http://localhost:5173/warranty/kakao/callback"

# ============================================
# Google Gemini AI (수면 분석기)
# ============================================
GEMINI_API_KEY="여기에_입력"
```

## 3단계: 각 환경변수 가져오기

### DATABASE_URL

1. [Supabase Dashboard](https://supabase.com/dashboard/project/ugzwgegkvxcczwiottej/settings/database) 접속
2. **Settings** → **Database** → **Connection string**
3. **URI** 탭 선택
4. 비밀번호 입력 후 복사

**형식 예시:**
```
postgresql://postgres.ugzwgegkvxcczwiottej:비밀번호@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### SUPABASE_SERVICE_ROLE_KEY

1. [Supabase Dashboard](https://supabase.com/dashboard/project/ugzwgegkvxcczwiottej/settings/api) 접속
2. **Settings** → **API** → **service_role** 키 복사

### GEMINI_API_KEY

1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. **Create API Key** 클릭
3. 생성된 키 복사

### Solapi 설정

1. [Solapi Console](https://console.solapi.com) 접속
2. **개발/연동** → **API Key** 에서 API Key/Secret 확인
3. **알림톡 관리** → **발신프로필** 에서 PF_ID 확인
4. **템플릿 관리** 에서 템플릿 ID 확인

## 4단계: 앱 실행

```bash
npm install
npm run dev
```

---

## ⚠️ 주의사항

- `.env` 파일은 **절대 Git에 커밋하지 마세요** (이미 .gitignore에 등록됨)
- 프로덕션 배포 시 Vercel/Railway 등에서 환경변수 별도 설정 필요

## 📋 환경변수 체크리스트

| 변수명 | 필수 | 용도 |
|--------|------|------|
| SUPABASE_URL | ✅ | Supabase 연결 |
| SUPABASE_ANON_KEY | ✅ | Supabase 클라이언트 |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | Admin 작업 |
| DATABASE_URL | ✅ | Drizzle ORM |
| SOLAPI_* | ⚠️ | SMS/알림톡 (전화번호 인증 시 필수) |
| KAKAO_CLIENT_ID | ⚠️ | 카카오 로그인 (마이페이지 시 필수) |
| GEMINI_API_KEY | ⚠️ | 수면 분석기 (수면 분석 시 필수) |
