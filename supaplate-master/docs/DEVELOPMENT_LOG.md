# 🗓️ 썬데이허그 앱 개발 기록 일지

> 이 문서는 썬데이허그 고객 앱의 개발 진행 상황을 추적합니다.

---

## 📅 2025년 12월 3일 (화)

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

*마지막 업데이트: 2025-12-03*

