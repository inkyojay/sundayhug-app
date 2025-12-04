# 🗓️ 썬데이허그 앱 개발 기록 일지

> 이 문서는 썬데이허그 고객 앱의 개발 진행 상황을 추적합니다.

---

## 📅 2025년 12월 4일 (목) - AI 상담 개선, 수면분석 결과 개선, 후기 이벤트 보증서 연동

### 🎯 주요 작업 내용

#### 1. AI 육아 상담 대폭 개선

**자연스러운 대화체 프롬프트**
- 마크다운 문법(###, **, -, 1. 2. 3.) 완전 제거
- 선배 엄마가 카톡으로 조언하는 느낌의 말투
- 짧은 문단 (2~3문장씩)으로 읽기 편하게
- 이모지는 답변 끝에 하나만 자연스럽게

**대화 맥락 유지 (세션 메모리)**
- 세션별 메시지를 Supabase에 저장
- AI에게 최근 10개 메시지를 컨텍스트로 전달
- "아까 말한 거" 같은 맥락 참조 가능

**채팅 UI 개선**
- 데스크탑: max-w-2xl (672px) 중앙 정렬, 카드 형태
- AI 메시지에 "AI 육아 상담사" 라벨 추가
- 아기 정보 없으면 먼저 입력 유도 (프로필 저장)

#### 2. 수면 분석 결과 개선

**분석 결과 조회 페이지 개선**
- 분석 페이지와 동일한 UI 사용 (AnalysisResult 컴포넌트 재사용)
- 사진, 종합분석, 세부분석 모두 표시
- 이미지로 저장하기 버튼 추가

**이미지 저장 기능**
- "이미지 저장" 버튼 제거
- "인스타 슬라이드" → "이미지로 저장하기"로 이름 변경
- 로딩 메시지: "이미지 생성 중... 잠시만 기다려주세요"
- 모바일: Web Share API로 사진첩 저장 지원

**기타 수정**
- 사진 용도 안내 문구: "업로드된 사진은 분석 사용 용도로만 이용됩니다"
- image_base64도 DB에 저장 (스토리지 실패 대비)
- feedbackItems를 summary JSON에서 추출하도록 수정

#### 3. 후기 이벤트 보증서 연동

**보증서 연동 플로우**
- ABC 아기침대 선택 시 보증서 연동 섹션 표시
- 보증서 없으면: 인라인 보증서 등록 폼 (화면 전환 없음)
- 보증서 있으면: 기존 보증서 선택 UI
- 등록 완료 시 즉시 목록에 반영

**제출 완료 화면**
- 전체 화면 완료 페이지로 전환
- 성공 아이콘 (bounce 애니메이션)
- 진행 안내: 관리자 검토 → 승인 알림 → 사은품 발송
- 마이페이지 확인 / 홈으로 돌아가기 버튼

#### 4. 보증서 등록 개선

**제품 선택 단계 추가**
- 보증서 등록 전 제품 선택 (현재 ABC 아기침대만)
- 선택한 제품에 맞는 안내 문구 표시

#### 5. UI 수정

**홈 화면**
- "썬데이허그 구매 후기 이벤트 참여" → "구매 후기 이벤트 참여"
- 회원가입 버튼 다크모드 가시성 수정

---

### 🔧 수정/추가된 파일

```
수정 파일:
app/features/chat/api/send-message.tsx        # 자연스러운 프롬프트, 대화 맥락 유지
app/features/chat/screens/chat-room.tsx       # 데스크탑 UI, 아기 정보 입력 플로우
app/features/customer/screens/event-review.tsx # 보증서 연동, 제출 완료 화면
app/features/customer/screens/home.tsx        # 버튼 텍스트 수정
app/features/sleep-analysis/components/analysis-result.tsx  # 버튼 변경
app/features/sleep-analysis/components/upload-form.tsx      # 사진 용도 문구
app/features/sleep-analysis/lib/sleep-analysis.server.ts    # image_base64 저장
app/features/sleep-analysis/screens/analyze.tsx             # 다운로드 함수
app/features/sleep-analysis/screens/analyze-public.tsx      # 다운로드 함수
app/features/sleep-analysis/screens/result.tsx              # 동일 UI 재사용
app/features/warranty/screens/public/register.tsx           # 제품 선택 단계
```

---

### 🗃️ DB 변경사항

```sql
-- review_submissions에 보증서 연동
ALTER TABLE review_submissions ADD COLUMN warranty_id UUID REFERENCES warranties(id);
CREATE INDEX idx_review_submissions_warranty_id ON review_submissions(warranty_id);
```

---

### ✅ 완료된 TODO

- [x] AI 상담 자연스러운 대화체 프롬프트
- [x] AI 상담 대화 맥락 유지 (세션 메모리)
- [x] 채팅 UI 데스크탑 개선
- [x] 아기 정보 없으면 먼저 입력 유도
- [x] 수면 분석 결과 조회 UI 개선
- [x] 이미지로 저장하기 버튼 (인스타 슬라이드)
- [x] 후기 이벤트 보증서 연동
- [x] 보증서 인라인 등록
- [x] 후기 제출 완료 전체 화면
- [x] 보증서 등록 제품 선택 단계

---

### 🔜 향후 작업 예정

- [ ] 모바일 이미지 다운로드 사진첩 저장 개선
- [ ] AI 상담 음성 입력/출력
- [ ] 후기 승인 시 포인트 자동 지급
- [ ] 사은품 배송 처리

---

## 📅 2025년 12월 3일 (수) - 후기 이벤트 시스템 구축

### 🎯 주요 작업 내용

#### 1. 후기 이벤트 시스템 (이벤트 ↔ 일반 후기 분리)

**이벤트 후기 시스템** (`/customer/event/review`)
- 진행 중인 이벤트 자동 조회 (날짜 기반)
- **제품별 사은품 1:1 매칭** UI
  - 백색소음기 후기 → 속싸개 L 사이즈
  - 슬리핑백 후기 → 아동용 후드티
  - 꿀잠 속싸개 후기 → 슬리핑백 S 사이즈
  - 신생아 스와들 후기 → 신생아 꼭지모자
  - 데일리 의류 후기 → 무릎 보호대
- 사은품 안내, 참여 방법, 유의사항 표시
- **배송지 입력**: Daum 우편번호 API 연동
- 프로필에 배송지 자동 저장

**일반 후기 시스템** (`/customer/mypage/review-submit`)
- 포인트만 지급 (이벤트/사은품 없음)
- 맘카페/인스타/블로그 후기 제출
- 제품 자동완성 검색
- 구매자 정보 확인

#### 2. Daum 우편번호 API 연동
- 무료 API (Key 발급 불필요)
- 스크립트 동적 로딩
- 우편번호, 도로명 주소 자동 입력
- 상세 주소 포커스 자동 이동

#### 3. 관리자 대시보드 - 이벤트 관리
- `/dashboard/events` - 이벤트 목록
- `/dashboard/events/new` - 이벤트 생성
- `/dashboard/events/:id` - 이벤트 수정
- `/dashboard/events/:id/submissions` - 참여자 관리

#### 4. 포인트 시스템 기반
- 프로필에 `points` 필드 추가
- 마이페이지에 "내 포인트" 카드 추가
- 후기 승인 시 포인트 지급 예정

---

### 🔧 수정/추가된 파일

```
신규 파일:
app/features/customer/screens/event-review.tsx       # 이벤트 후기 참여 페이지
app/features/customer/screens/mypage/points.tsx     # 포인트 내역 페이지
app/features/review/screens/admin/event-list.tsx    # 이벤트 관리 목록
app/features/review/screens/admin/event-form.tsx    # 이벤트 생성/수정
app/features/review/screens/admin/event-submissions.tsx  # 참여자 관리

수정 파일:
app/features/customer/screens/home.tsx              # 이벤트 버튼 링크 변경
app/features/customer/screens/mypage/index.tsx      # 포인트 카드 추가
app/features/customer/screens/mypage/review-submit.tsx  # 일반 후기 전용으로 단순화
app/features/review/screens/admin/review-list.tsx   # 이벤트 정보 표시
app/features/users/components/dashboard-sidebar.tsx # 이벤트 관리 메뉴
app/routes.ts                                       # 신규 라우트 추가
```

---

### 🗃️ DB 변경사항

```sql
-- 이벤트 관련 테이블
CREATE TABLE review_events (...);
CREATE TABLE review_event_products (...);
CREATE TABLE review_event_gifts (...);

-- 포인트 시스템
CREATE TABLE point_transactions (...);
ALTER TABLE profiles ADD COLUMN points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN address TEXT;
ALTER TABLE profiles ADD COLUMN address_detail TEXT;
ALTER TABLE profiles ADD COLUMN zipcode TEXT;

-- 후기 제출 확장
ALTER TABLE review_submissions ADD COLUMN event_id UUID;
ALTER TABLE review_submissions ADD COLUMN event_product_id UUID;
ALTER TABLE review_submissions ADD COLUMN selected_gift_id UUID;
ALTER TABLE review_submissions ADD COLUMN reward_points INTEGER;
ALTER TABLE review_submissions ADD COLUMN gift_status TEXT;
ALTER TABLE review_submissions ADD COLUMN tracking_number TEXT;
ALTER TABLE review_submissions ADD COLUMN shipping_* (배송지 필드들);

-- 테스트 이벤트 데이터
INSERT INTO review_events (12월 ABC 아기침대 후기 이벤트, 12월 맘카페 후기 이벤트);
INSERT INTO review_event_products (5개 제품);
INSERT INTO review_event_gifts (7개 사은품, 제품별 1:1 매칭);
```

---

### ✅ 완료된 TODO

- [x] 이벤트 후기 / 일반 후기 분리
- [x] 제품별 사은품 1:1 매칭 UI
- [x] Daum 우편번호 API 연동
- [x] 배송지 프로필 저장
- [x] 포인트 시스템 기반 구축
- [x] 관리자 이벤트 관리 대시보드
- [x] 테스트 이벤트 데이터 생성

---

### 🔜 향후 작업 예정

- [ ] 후기 승인 시 포인트 자동 지급
- [ ] 사은품 배송 처리 (송장번호 업로드)
- [ ] 포인트 적립/사용 내역 페이지
- [ ] 회원 등급 시스템 구현

---

## 📅 2025년 12월 3일 (화) - 야간 작업

### 🎯 블로그 대량 업로드 및 Feature Flags 시스템

#### 1. 블로그 글 168개 업로드
- CSV 파일에서 블로그 데이터 파싱
- `blog_posts` 테이블에 168개 글 업로드
- 자동 slug 생성 (한글 제목 → 영문 URL)
- 카테고리: sleep-guide (수면 가이드)

#### 2. 블로그 벡터 임베딩 (RAG 연동)
- 168개 블로그 글 → 벡터 임베딩
- `chat_knowledge` 테이블에 저장
- AI 상담에서 블로그 내용도 참고 가능
- **총 지식 베이스: 257개** (89 + 168)

#### 3. Feature Flags 시스템 (환경변수 기반)
- `FEATURE_CHAT_ENABLED`, `FEATURE_BLOG_ENABLED` 환경변수
- 기본값: true (활성화)
- Vercel Production에서만 false 설정 → 해당 기능 비활성화
- 코드 수정 없이 기능 on/off 가능

#### 4. 홈 화면 Feature Flags 적용
- AI 육아 상담 카드: `features.chatEnabled`로 조건부 렌더링
- 블로그 카드: `features.blogEnabled`로 조건부 렌더링
- 오렌지/에메랄드 그라데이션 카드 디자인

#### 5. routes.ts 라우트 활성화
- `/customer/chat/*` - AI 육아 상담
- `/customer/blog/*` - 육아 블로그

---

### 🔧 수정/추가된 파일

```
app/features/customer/screens/home.tsx      # Feature Flags 조건부 렌더링
app/features/settings/screens/feature-flags.tsx  # Feature Flags 관리 페이지 (신규)
app/features/users/components/dashboard-sidebar.tsx  # 사이드바 메뉴 추가
app/routes.ts                               # 블로그/채팅 라우트 활성화
data/blog-*.csv                             # 블로그 템플릿 파일
```

---

### 🗃️ DB 변경사항

```sql
-- Feature Flags 테이블 (향후 확장용)
CREATE TABLE feature_flags (
  key TEXT UNIQUE,
  enabled BOOLEAN,
  name TEXT,
  description TEXT,
  category TEXT
);

-- 블로그 168개 업로드
INSERT INTO blog_posts (...) -- 168 rows
INSERT INTO chat_knowledge (...) -- 168 rows (벡터 임베딩)
```

---

### 🔑 환경변수 (Vercel Production)

```bash
FEATURE_CHAT_ENABLED=false   # AI 상담 비활성화
FEATURE_BLOG_ENABLED=false   # 블로그 비활성화
OPENAI_API_KEY=sk-proj-...   # 벡터 임베딩용
```

---

### ✅ 완료된 TODO

- [x] 블로그 168개 업로드
- [x] 블로그 벡터 임베딩 (RAG)
- [x] Feature Flags 환경변수 기반 시스템
- [x] 홈 화면 조건부 렌더링
- [x] routes.ts 라우트 활성화

---

### 🔜 향후 작업 예정

- [ ] AI 상담 기능 테스트 및 개선
- [ ] 블로그 기능 테스트 및 개선
- [ ] main 브랜치 배포 (준비 완료 시)

---

## 📅 2025년 12월 3일 (화) - 오후 추가 작업

### 🎯 벡터 RAG 시스템 구축 (OpenAI Embeddings)

#### 1. 고급 RAG 시스템 구현
- **기존 키워드 검색 → 벡터 유사도 검색으로 업그레이드**
- OpenAI `text-embedding-3-small` 모델 사용
- pgvector 확장을 활용한 코사인 유사도 검색
- 의미 기반 검색으로 정확도 대폭 향상

#### 2. 지식 베이스 임베딩
- **89개 육아 지식 데이터 벡터화 완료**
- CSV 파일에서 데이터 로드
- 질문+답변 결합 텍스트 임베딩
- Supabase `chat_knowledge` 테이블에 저장

#### 3. 벡터 검색 SQL 함수
```sql
-- search_knowledge(query_embedding, match_count, filter_topic, filter_age_range)
-- increment_knowledge_usage(knowledge_id) - 사용량 추적
```

#### 4. AI 상담 API 업그레이드
- 사용자 질문 → 벡터 변환 → 유사도 검색
- 폴백: 벡터 검색 실패 시 키워드 검색
- 검색 결과 로깅 (유사도 점수 포함)

---

### 🔧 수정/추가된 파일

```
scripts/embed-knowledge.ts           # 임베딩 생성 스크립트 (신규)
app/features/chat/api/send-message.tsx  # 벡터 RAG 검색 연동
```

---

### 📦 설치된 패키지

```bash
npm install openai
```

---

### 🔑 환경변수 추가

```bash
OPENAI_API_KEY="sk-proj-..." # OpenAI API 키 (벡터 임베딩용)
```

---

### 🗃️ DB 마이그레이션

```sql
-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 벡터 유사도 검색 함수
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_topic text DEFAULT NULL,
  filter_age_range text DEFAULT NULL
) RETURNS TABLE (...);

-- 사용량 카운트 업데이트 함수
CREATE OR REPLACE FUNCTION increment_knowledge_usage(knowledge_id uuid);
```

---

### ✅ 완료된 TODO

- [x] OpenAI 임베딩 스크립트 작성
- [x] 89개 육아 지식 데이터 벡터화
- [x] 유사도 검색 SQL 함수 생성
- [x] AI 상담 API에 벡터 검색 연동

---

### 🔜 향후 작업 예정

- [ ] 매거진 발행 시 자동 임베딩 추가
- [ ] 검색 정확도 모니터링 대시보드
- [ ] 지식 데이터 추가 (age_range 제약 수정)

---

## 📅 2025년 12월 3일 (화) - 오전 작업

### 🎯 주요 작업 내용

#### 1. 수면 분석 점수화 시스템 구현
- **AI 분석에 0-100점 점수 추가**
  - Gemini 프롬프트에 `safetyScore`, `scoreComment` 필드 추가
  - 점수 계산 로직: High -20점, Medium -10점
  - 점수 등급: 매우 안전(90+), 안전(75+), 보통(60+), 주의(40+), 위험(39-)
  - 별점 표시 (⭐1~5개)

- **기존 데이터 호환**
  - feedbackItems 기반 점수 자동 계산 로직 추가
  - JSON 파싱 실패 시 fallback 처리

#### 2. 바이럴 마케팅 기능 구현
- **공유 카드 이미지 생성 API**
  - `GET /api/sleep/:id/share-card` - SVG/PNG 카드 생성
  - 점수, 위험도 요약, CTA 포함

- **카카오톡 SDK 연동**
  - `VITE_KAKAO_JAVASCRIPT_KEY` 환경변수 추가
  - 카카오톡 공유 버튼 구현 (점수 포함 피드 공유)

- **추천인 코드 시스템 (DB)**
  - `profiles.referral_code` - 8자리 자동 생성
  - `profiles.referred_by` - 추천인 ID
  - `referral_logs` 테이블 생성

#### 3. UI/UX 개선
- **분석 결과 화면 개선**
  - 점수 원형 게이지 추가
  - 위험도 색상 수정 (High=빨강, Medium=노랑, Low=초록)
  - PC/모바일 반응형 레이아웃

- **분석 이력 페이지 개선**
  - 점수 표시
  - 등급 표시
  - 위험도별 개수 배지

- **마이페이지 재구성**
  - 고객센터, ABC 설명서 섹션 제거
  - 깔끔한 Bento Grid 레이아웃
  - 색상별 아이콘 추가

#### 4. 수면 분석 입력 폼 개선
- **아이 정보 선택/입력**
  - 등록된 아이 선택 또는 새 아이 입력
  - 프로필에 자동 저장

- **모바일 친화적 멘트**
  - "드래그 앤 드롭" → "사진 촬영 또는 앨범에서 선택"

- **사진 가이드라인 추가**
  - 좋은 예시 / 분석 불가 예시 안내

- **개인정보 동의 체크박스**
  - 사진 1회 분석 후 삭제 안내
  - 전화번호 수집 동의

---

### 🔧 수정된 주요 파일

```
app/features/sleep-analysis/
├── lib/gemini.server.ts          # 점수화 시스템 추가
├── components/analysis-result.tsx # 점수 UI, 공유 기능
├── components/upload-form.tsx     # 아이 선택, 사진 가이드
├── screens/analyze-public.tsx     # 아이 정보 전달
├── screens/result.tsx             # 점수 표시
├── api/share-card.server.ts       # 공유 카드 생성
├── api/share-card.route.ts        # 공유 카드 API
└── schema.ts                      # 타입 정의

app/features/customer/screens/
├── mypage/index.tsx               # 마이페이지 재구성
├── mypage/analyses.tsx            # 분석 이력 점수 표시
└── mypage/profile.tsx             # 아이 정보 관리

app/root.tsx                       # 카카오 SDK 추가
app/routes.ts                      # share-card API 라우트
```

---

### 📦 설치된 패키지

```bash
npm install html2canvas satori sharp @resvg/resvg-js
```

---

### 🔑 환경변수

```bash
VITE_KAKAO_JAVASCRIPT_KEY=4a215fb45569a16077443a78541f90a3
```

---

### 🗃️ DB 마이그레이션

```sql
-- 추천인 코드 시스템
ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN referred_by UUID;
ALTER TABLE profiles ADD COLUMN referral_count INTEGER DEFAULT 0;
CREATE TABLE referral_logs (...);
```

---

### ✅ 완료된 TODO

- [x] AI 분석에 점수화 시스템 추가 (0-100점)
- [x] 공유용 카드 이미지 생성 API 구현
- [x] 카카오 SDK 연동
- [x] 분석 결과 UI에 점수/공유 카드 통합
- [x] 추천인 코드 시스템 (DB)

---

### 🔜 향후 작업 예정

- [ ] 추천인 코드 UI (회원가입 시 입력, 공유 시 표시)
- [ ] 추천 보상 시스템 구현
- [ ] 인스타그램 스토리 공유 최적화
- [ ] 점수 기반 랭킹/챌린지 기능

---

## 📅 이전 작업 내역

### 2025년 12월 2일 이전
- 블로그 시스템 구현
- TTS 오디오 기능
- AI 육아 상담 챗봇
- 디지털 보증서 시스템
- 홈 화면 개선

---

*마지막 업데이트: 2025-12-04*

