# 🚀 썬데이허그 모바일 앱 개발 핸드오프 문서

> 새 에이전트에 이 내용을 복사해서 붙여넣으세요.

---

## 📋 프로젝트 개요

**썬데이허그 (SundayHug)** - 육아용품 브랜드의 고객 서비스 앱

### 주요 기능 (웹에서 구현 완료)
1. **AI 육아 상담 챗봇** - Gemini 기반, 음성 대화 지원 (ElevenLabs)
2. **수면 환경 분석** - 사진 업로드 → AI 분석 → 제품 추천
3. **수면 예보** - 날씨/계절 기반 수면 예측
4. **BabyReels** - 수면 분석 결과로 맞춤 릴스 생성 (가사 + 음악)
5. **디지털 보증서** - 제품 보증서 등록/조회/A/S 신청
6. **후기 인증 이벤트** - 맘카페/인스타/블로그 후기 인증

### 기존 웹앱 URL
- **고객 웹**: https://app.sundayhug.kr
- **개발 서버**: https://sundayhug-app-git-develop-inkyos-projects.vercel.app
- **GitHub**: https://github.com/inkyojay/sundayhug-app

---

## 🔐 Supabase 연결 정보

```env
# Supabase 프로젝트 (JAYCORP)
SUPABASE_URL=https://ugzwgegkvxcczwiottej.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnendnZWdrdnhjY3p3aW90dGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3NjQ2MDksImV4cCI6MjA0ODM0MDYwOX0.S5S0IWRhbLB99Z2WWBVJWw16EtZzVD0-k7lZnJx3hNE

# Project ID (MCP 등에서 사용)
SUPABASE_PROJECT_ID=ugzwgegkvxcczwiottej
```

---

## 🗄️ 주요 DB 테이블 (앱에서 사용할 것들)

### 사용자 관련
```sql
-- profiles: 사용자 프로필 (auth.users와 1:1)
profiles (
  id uuid PRIMARY KEY,      -- auth.users.id와 동일
  name varchar,
  phone varchar UNIQUE,
  email varchar,
  kakao_id varchar,
  naver_id varchar,
  provider text,            -- 'kakao', 'naver', 'email'
  points integer DEFAULT 0,
  created_at timestamptz
)

-- baby_profiles: 아기 정보 (다중 아이 지원)
baby_profiles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  name text,
  birth_date date,
  feeding_type text,        -- 'breast', 'formula', 'mixed'
  gender text,              -- 'male', 'female'
  sleep_sensitivity text,   -- 'high', 'normal', 'low'
  created_at timestamptz
)
```

### AI 육아 상담
```sql
-- chat_sessions: 채팅 세션
chat_sessions (
  id uuid PRIMARY KEY,
  user_id uuid,
  baby_id uuid,             -- 어떤 아이에 대한 상담인지
  title text,
  topic text,               -- 'sleep', 'feeding', 'health', 등
  is_active boolean DEFAULT true,
  created_at timestamptz
)

-- chat_messages: 채팅 메시지
chat_messages (
  id uuid PRIMARY KEY,
  session_id uuid,
  role text,                -- 'user', 'assistant'
  content text,
  image_url text,           -- 첨부 이미지
  audio_url text,           -- 음성 메시지
  sources jsonb,            -- 참고 자료 링크
  created_at timestamptz
)

-- chat_knowledge: RAG용 지식 베이스 (257개)
chat_knowledge (
  id uuid PRIMARY KEY,
  topic text,               -- 'sleep', 'feeding', 등
  age_range text,           -- '0-3m', '4-6m', 등
  question text,
  answer text,
  source_name text,
  source_url text,
  embedding vector(1536)    -- OpenAI 임베딩
)
```

### 수면 분석
```sql
-- sleep_analyses: 수면 환경 분석 결과
sleep_analyses (
  id uuid PRIMARY KEY,
  user_id uuid,
  image_url text,
  birth_date date,
  age_in_months integer,
  summary text,             -- AI 분석 요약
  created_at timestamptz
)

-- sleep_analysis_feedback_items: 분석 피드백 항목 (이미지 위 핀)
sleep_analysis_feedback_items (
  id uuid PRIMARY KEY,
  analysis_id uuid,
  x numeric,                -- 이미지 상 X 좌표 (%)
  y numeric,                -- 이미지 상 Y 좌표 (%)
  title text,
  feedback text,
  risk_level varchar        -- 'high', 'medium', 'low'
)
```

### 보증서/A/S
```sql
-- warranties: 디지털 보증서
warranties (
  id uuid PRIMARY KEY,
  user_id uuid,
  warranty_number varchar UNIQUE,  -- 'SH-W-YYYYMMDD-XXXX'
  customer_phone varchar,
  product_name varchar,
  warranty_start date,
  warranty_end date,
  status varchar,           -- 'pending', 'approved', 'rejected'
  created_at timestamptz
)

-- as_requests: A/S 신청
as_requests (
  id uuid PRIMARY KEY,
  warranty_id uuid,
  request_type varchar,     -- 'repair', 'exchange', 'refund'
  issue_description text,
  issue_photos text[],
  status varchar,           -- 'received', 'processing', 'completed'
  created_at timestamptz
)
```

---

## 🔑 외부 API 키

```env
# AI 관련
GEMINI_API_KEY=xxx              # Google Gemini (채팅, 수면분석)
OPENAI_API_KEY=xxx              # OpenAI Embeddings (RAG)
ELEVENLABS_API_KEY=xxx          # 음성 대화 (STT/TTS)
SUNO_API_KEY=xxx                # 음악 생성 (BabyReels)

# SMS 인증
SOLAPI_API_KEY=NCSLC95I2UYGLZWY
SOLAPI_API_SECRET=VGNU1DGCHY1HTGP12XDRAZILLBGNANFB
SOLAPI_SENDER_NUMBER=01026620486

# 카카오 로그인
KAKAO_CLIENT_ID=2737860d151daba73e31d3df6213a012
KAKAO_REDIRECT_URI=https://app.sundayhug.kr/customer/kakao/callback
```

---

## 📱 앱에서 구현할 핵심 기능

### 1. 인증
- [x] 카카오 로그인 (현재 메인)
- [x] 네이버 로그인
- [x] 이메일/비밀번호 가입 + SMS 인증
- [ ] 전화번호 중복 체크 (카카오↔이메일 통합)

### 2. AI 육아 상담
- [x] 텍스트 채팅
- [x] 이미지 첨부 (Gemini Vision)
- [x] 음성 입력 (STT)
- [x] 음성 재생 (TTS)
- [x] 아이별 채팅 세션 관리
- [x] RAG 기반 답변 (chat_knowledge)

### 3. 수면 환경 분석
- [x] 사진 업로드
- [x] AI 분석 (Gemini Vision)
- [x] 위험 요소 표시 (이미지 위 핀)
- [x] 제품 추천
- [ ] 인스타그램 카드 공유

### 4. 보증서 관리
- [x] 보증서 등록
- [x] 보증서 목록/상세 조회
- [x] A/S 신청

### 5. 푸시 알림 (앱에서 새로 구현)
- [ ] 채팅 답변 알림
- [ ] 보증서 승인 알림
- [ ] 이벤트/프로모션 알림

---

## 🛠️ 기술 스택 추천

```
프레임워크: React Native + Expo (SDK 51+)
라우팅: Expo Router (파일 기반)
상태관리: Zustand 또는 Jotai
스타일링: NativeWind (Tailwind for RN)
DB 연동: @supabase/supabase-js
푸시 알림: Expo Notifications
앱 배포: Expo EAS
```

---

## 📂 웹앱 참고 코드 위치

```
sundayhug-app/apps/customer/app/features/
├── auth/                   # 인증 (카카오, 네이버, 이메일)
├── chat/                   # AI 육아 상담
│   ├── screens/chat-room.tsx      # 채팅 화면
│   ├── api/send-message.tsx       # 메시지 API (Gemini 연동)
│   └── api/speech-to-text.tsx     # STT API (ElevenLabs)
├── sleep-analysis/         # 수면 환경 분석
│   ├── screens/analyze-public.tsx # 분석 화면
│   └── api/analyze.tsx            # 분석 API (Gemini Vision)
├── warranty/               # 보증서
├── baby-reels/             # 릴스 생성
└── customer/screens/       # 홈, 마이페이지 등
```

---

## 🚨 주의사항

1. **Supabase RLS**: 대부분 테이블에 Row Level Security 적용됨
   - `user_id = auth.uid()` 조건으로 본인 데이터만 접근

2. **이미지 저장소**: Supabase Storage 사용
   - 버킷: `sleep-analysis-images`, `warranty-photos`, `blog-audio`

3. **카카오 로그인**: Supabase OAuth 아닌 직접 REST API 호출
   - scope 세부 제어 위해 커스텀 구현됨

4. **SMS 인증**: Solapi API 사용
   - 발신번호: 07077038005 (등록된 번호만 가능)

---

## 📞 문의

웹앱 관련 질문은 기존 웹 에이전트에서 확인 가능합니다.




