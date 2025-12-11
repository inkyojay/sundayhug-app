# 🗓️ 썬데이허그 앱 개발 기록 일지

> 이 문서는 썬데이허그 고객 앱의 개발 진행 상황을 추적합니다.

---

## 📅 2025년 12월 10일 (화) - 카드뉴스 슬라이드 디자인 리뉴얼 착수

### 🎯 주요 작업 내용

#### 1. 카드뉴스 슬라이드 디자인 분석 및 기획

**기존 문제점 파악**
- 현재 satori 기반 슬라이드 생성 코드로는 복잡한 디자인 구현 한계
- 기울어진 사진 프레임, 줄노트 스타일, 곡선 장식 등 CSS 고급 기능 미지원
- Vercel 서버리스 환경에서 로컬 파일(폰트, 아이콘) 접근 문제

**새 디자인 템플릿 분석 (6장)**
1. 썸네일: "OO이의 수면환경 기록 일지" - 분홍 헤더, 기울어진 사진, 양+말풍선
2. 엄마의 현실일기: 하늘색 헤더, 줄노트 스타일 일기
3. 이미지+핀+점수: 신호등 헤더, 사진에 번호 핀, 점수 말풍선
4. Bad 피드백: 주의 항목 3개 + 추천 제품 3개
5. Good 피드백: 잘한 점 3개 + 양 캐릭터 총평
6. CTA: 하늘색 곡선 장식, "분석 받으러 가기" 버튼

#### 2. 기술 스택 전환 결정

**satori → HTML/CSS + Puppeteer 전환 예정**
- 이유: satori는 flexbox 기반으로 복잡한 디자인(회전, 곡선, 노트 스타일) 구현 어려움
- 새 방식: HTML/CSS로 정확한 디자인 구현 → Puppeteer로 스크린샷 캡처
- 역할 분담: 사용자가 HTML/CSS 제작, 개발자가 Puppeteer 연동 담당

#### 3. 에셋 업로드 및 환경 설정

**Supabase Storage 업로드**
- sheep.png (양 캐릭터) → `sleep-analysis/assets/sheep.png`
- logo.png (SUNDAY HUG 로고) → `sleep-analysis/assets/logo.png`

**폰트 파일 추가**
- Cafe24PROUP.ttf (타이틀용)
- Pretendard-Regular.ttf (본문용)
- Pretendard-Bold.ttf (본문 볼드용)

#### 4. 디자인 지시서 작성

**문서 작성: `docs/card-news-design-spec.md`**
- 슬라이드별 상세 레이아웃 설명
- 동적 데이터 플레이스홀더 정의 (`{{babyName}}`, `{{safetyScore}}` 등)
- 에셋 목록 및 결과물 형식 명시

---

### 🔧 수정/추가된 파일

```
신규 파일:
├── docs/card-news-design-spec.md (디자인 지시서)
├── app/features/sleep-analysis/assets/fonts/Cafe24PROUP.ttf
├── app/features/sleep-analysis/assets/fonts/Pretendard-Bold.ttf
├── app/features/sleep-analysis/assets/fonts/Pretendard-Regular.ttf
├── app/features/sleep-analysis/assets/icons/sheep.png
└── app/features/sleep-analysis/assets/icons/logo.png

수정 파일:
├── app/features/sleep-analysis/lib/slides.server.ts (새 디자인 시도, 아이콘 URL fallback 추가)
├── app/features/sleep-analysis/lib/gemini.server.ts (momsDiary 필드 추가, 글자수 제한)
├── app/features/sleep-analysis/schema.ts (momsDiary 필드 추가)
├── app/features/sleep-analysis/api/slides.tsx (디버그 로그 추가)
└── app/features/sleep-analysis/screens/result.tsx (momsDiary 기본값 추가)
```

---

### 📝 다음 단계

1. **HTML/CSS 디자인 제작** (사용자 담당)
   - 6장 슬라이드 HTML 파일 작성
   - 동적 데이터 플레이스홀더 적용

2. **Puppeteer 연동** (개발자 담당)
   - HTML 템플릿 로딩
   - 동적 데이터 바인딩
   - 스크린샷 캡처 및 PNG 반환

3. **API 통합**
   - 기존 slides API에 Puppeteer 방식 적용
   - Storage 업로드 및 DB 업데이트

---

### 🔗 관련 커밋

- `946501a` - feat: 카드뉴스 슬라이드 디자인 새로 구현
- `645f5cd` - fix: 슬라이드 API에 새 디자인 필드 추가
- `e6c30c9` - fix: 아이콘 로딩을 Storage URL fallback으로 변경
- `bce1544` - debug: 슬라이드 API에 버전 로그 추가

---

## 📅 2025년 12월 4일 (목) - 저녁 작업: main-ready 브랜치 배포, 수면 분석 개선

### 🎯 주요 작업 내용

#### 1. main-ready 브랜치 배포 설정

**develop → main-ready 체리픽 후 비활성화 적용**
- 🤖 **AI 육아 상담**: 기능 비활성화, 홈 카드는 "준비중" 표시
- 📝 **육아 블로그**: 완전 비활성화 (카드, 헤더 링크 모두 숨김)
- 👤 **마이페이지**: 포인트 카드, 후기 인증 핑크 카드 숨김
- 🎁 **후기 이벤트**: `/customer/event/review` 정상 작동

#### 2. 수면 분석 이력 UI 수정

**분석 이력 리스트 (`/customer/mypage/analyses`)**
- 이미지 썸네일 → **점수 원형**으로 변경
- 점수별 배경색 적용 (90+ 초록, 75+ 파랑, 60+ 노랑, 40+ 주황, 빨강)
- 위험도 요약 핀 표시

**분석 결과 상세 (`/customer/sleep/result/:id`)**
- feedbackItems 파싱 수정: `id`, `x`, `y` 좌표 올바르게 추출
- 이미지 위 위험도 핀 위치 정확하게 표시
- **이미지로 저장하기** 버튼 활성화

#### 3. 이미지 저장 기능 개선 (모바일 최적화)

**Web Share API 지원**
- 모바일에서 Web Share API 사용 가능 시 → 공유 시트로 저장
- 미지원 시 → 일반 다운로드 폴백

**진행 상태 표시**
- `saveProgress` 상태 추가
- "이미지 생성 중..." → "화면 캡처 중..." → "이미지 저장 중..."

**다운로드 방식 개선**
- `dataURL` → `Blob` 방식으로 변경 (메모리 효율 개선)
- 모바일 다운로드 완료 시 안내 alert 표시

---

### 🔧 수정/추가된 파일

```
수정 파일:
app/features/sleep-analysis/components/analysis-result.tsx  # 이미지 저장 개선, 버튼 활성화
app/features/sleep-analysis/screens/result.tsx               # feedbackItems 파싱 수정
app/features/customer/screens/mypage/analyses.tsx            # 점수 원형 표시
app/features/customer/screens/mypage/index.tsx               # 카드 숨김 (main-ready)
app/features/customer/screens/home.tsx                       # AI 상담 준비중, 블로그 숨김 (main-ready)
app/routes.ts                                                # 블로그/채팅 비활성화 (main-ready)
```

---

### 🌿 브랜치별 기능 상태

| 기능 | develop | main-ready |
|------|---------|------------|
| AI 육아 상담 | ✅ 활성화 | ⏸️ 준비중 (비활성화) |
| 육아 블로그 | ✅ 활성화 | ❌ 숨김 |
| 후기 이벤트 | ✅ 활성화 | ✅ 활성화 |
| 마이페이지 포인트 | ✅ 표시 | ❌ 숨김 |
| 마이페이지 후기 인증 | ✅ 표시 | ❌ 숨김 |

---

### ✅ 완료된 TODO

- [x] main-ready 브랜치 기능별 비활성화
- [x] 수면 분석 이력 점수 원형 표시
- [x] 수면 분석 결과 feedbackItems 파싱 수정
- [x] 이미지로 저장하기 버튼 활성화
- [x] 모바일 Web Share API 지원
- [x] 이미지 저장 진행 상태 표시

---

### 🔜 향후 작업 예정

- [ ] 메인 브랜치 배포 준비
- [ ] AI 썸네일 생성 (Vertex AI Imagen 연동)
- [ ] 후기 승인 시 포인트 자동 지급
- [ ] 사은품 배송 처리

---

## 📅 2025년 12월 4일 (목) - 오후 작업: 다크모드 개선, 후기 관리 UI 대폭 개선, 카카오 로그인 개선

### 🎯 주요 작업 내용

#### 1. 다크모드 UI 버그 수정

**헤더 사용자 이름**
- `text-gray-900` → `dark:text-white` 추가
- VIP Member 텍스트 다크모드 대응

**수면 분석 페이지**
- 배경색: `bg-[#F5F5F0]` → `dark:bg-[#121212]`
- 제목/텍스트: `dark:text-white`, `dark:text-gray-400`
- 폼 컨테이너: `dark:bg-gray-800`, `dark:border-gray-700`
- 로딩 메시지 다크모드 대응

**동의 강조 텍스트 색상 개선**
- "분석 사용 용도로만 이용됩니다" 텍스트를 **오렌지색(`text-[#FF6B35]`)**으로 변경
- 다크/라이트 모드 모두에서 가독성 확보

**홈 화면 Quick Links**
- 배경: `dark:bg-gray-800/60`
- 텍스트: `dark:text-white`, `dark:text-gray-400`
- 아이콘: `dark:text-gray-500`

**후기 이벤트 버튼**
- 전체 카드 스타일 다크모드 적용

#### 2. 후기 인증 관리 페이지 - 데이터 조회 수정

**문제점**
- Supabase에서 `profiles:user_id` 조인이 제대로 작동하지 않음
- `profiles` 테이블은 `id`가 PK, `review_submissions`는 `user_id`로 참조

**해결책**
- `review_submissions`와 `profiles`를 별도로 쿼리
- JavaScript에서 `user_id` 기준으로 병합

#### 3. 후기 인증 관리 페이지 - UI 대폭 개선

**이벤트/일반 후기 구분**
- 🎉 **이벤트 후기**: 주황색-핑크색 그라데이션 배너 + 이벤트명 표시
- ⭐ **일반 후기**: 파랑색-시안색 그라데이션 배너 + "포인트 적립" 표시

**보증서 인증 여부 표시**
- ✅ **보증서 인증됨**: 초록색 뱃지 (ShieldCheck 아이콘)
- ⏳ **보증서 대기중**: 노란색 뱃지
- ❌ **보증서 미등록**: 회색 뱃지

**첨부 사진 크게 보기**
- 썸네일 클릭 시 **전체화면 이미지 뷰어** 모달
- 4장 이상일 경우 "+N" 표시
- 여러 장일 때 **인디케이터**로 이동 가능

**선물 상태 관리** (이벤트 후기)
- 선택한 사은품 정보 표시 (이미지 + 이름)
- 선물 상태: 대기 → 승인 → 발송완료 → 배송완료

**확장 영역 (상세 정보 보기)**
- 배송 정보 (이름, 연락처, 주소)
- 보증서 상세 (번호, 제품, 보증기간)
- 반려 사유

**통계 카드 개선**
- 전체 / 대기중 / 승인됨 / 반려됨
- **이벤트 후기 수** / **일반 후기 수** 추가

**기타 개선**
- 다크모드 전체 지원
- 반응형 디자인 (모바일/태블릿/데스크탑)
- 승인 시 `gift_status`도 'approved'로 자동 변경

#### 4. 카카오 로그인 개선

**추가 정보 수집**
- 카카오 OAuth scope 확장: `profile_nickname, profile_image, account_email, phone_number, name, gender, age_range, birthday`
- 직접 Kakao REST API 호출로 상세 정보 수집

**profiles 테이블 확장**
- 새 컬럼: `kakao_id`, `kakao_nickname`, `kakao_profile_image`, `gender`, `age_range`, `birthday`, `provider`
- 카카오 로그인 시 자동 저장

**Supabase Admin API 연동**
- `SUPABASE_SERVICE_ROLE_KEY` 환경변수 추가
- `adminClient`로 사용자 생성/조회

---

### 🔧 수정/추가된 파일

```
수정 파일:
app/features/customer/layouts/customer.layout.tsx    # 헤더 다크모드
app/features/customer/screens/home.tsx               # Quick Links 다크모드
app/features/customer/screens/login.tsx              # 카카오 로그인 scope
app/features/customer/screens/kakao-callback.tsx     # 카카오 콜백 처리 (신규)
app/features/sleep-analysis/screens/analyze-public.tsx  # 다크모드
app/features/sleep-analysis/components/upload-form.tsx  # 동의 텍스트 색상
app/features/review/screens/admin/review-list.tsx    # UI 대폭 개선
app/routes.ts                                        # 카카오 콜백 라우트
```

---

### 🔑 환경변수

```bash
# Vercel에 추가 필요
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# 카카오 콘솔 Redirect URI 추가
# Local: http://localhost:3000/customer/kakao/callback
# Develop: https://app-sundayhug-members-git-develop-inkyos-projects.vercel.app/customer/kakao/callback
# Main-Ready: https://app-sundayhug-members-git-main-ready-inkyos-projects.vercel.app/customer/kakao/callback
# Production: https://app.sundayhug.kr/customer/kakao/callback
```

---

### 🗃️ DB 변경사항

```sql
-- profiles 테이블 확장 (카카오 추가 정보)
ALTER TABLE profiles ADD COLUMN kakao_id VARCHAR UNIQUE;
ALTER TABLE profiles ADD COLUMN kakao_nickname VARCHAR;
ALTER TABLE profiles ADD COLUMN kakao_profile_image TEXT;
ALTER TABLE profiles ADD COLUMN gender TEXT;
ALTER TABLE profiles ADD COLUMN age_range TEXT;
ALTER TABLE profiles ADD COLUMN birthday TEXT;
ALTER TABLE profiles ADD COLUMN provider TEXT;

CREATE INDEX idx_profiles_kakao_id ON profiles(kakao_id);
CREATE INDEX idx_profiles_provider ON profiles(provider);
```

---

### ✅ 완료된 TODO

- [x] 헤더 이름 값 다크모드 대응
- [x] 수면 분석 페이지 다크모드 대응
- [x] 동의 강조 텍스트 색상 개선
- [x] 홈 화면 Quick Links 다크모드 대응
- [x] 후기 이벤트 버튼 다크모드 대응
- [x] 후기 인증 관리 데이터 조회 수정
- [x] 후기 인증 관리 UI 대폭 개선
- [x] 이벤트/일반 후기 구분 표시
- [x] 보증서 인증 여부 표시
- [x] 첨부 사진 크게 보기 (이미지 뷰어)
- [x] 카카오 로그인 추가 정보 수집

---

### 🔜 향후 작업 예정

- [ ] 후기 승인 시 포인트 자동 지급
- [ ] 사은품 배송 처리 (송장번호 업로드)
- [ ] AI 썸네일 생성 기능 완성 (Vertex AI Imagen 연동)

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

