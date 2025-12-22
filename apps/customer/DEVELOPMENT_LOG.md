# 썬데이허그 고객 앱 (Customer App) 개발 일지

## 2025-12-22 (일) - Placid 카드뉴스 연동

### 작업 내용

1. **Placid API 카드뉴스 생성 기능**
   - 수면 분석 결과를 인스타그램 카드뉴스 6장으로 자동 생성
   - Placid.app 템플릿 기반 이미지 생성
   - HCTI (htmlcsstoimage.com)로 피드백 카드 이미지 변환

2. **카드뉴스 6장 구성**
   - 1번: 썸네일 (아기이름, 사진, 목표)
   - 2번: 엄마의 현실일기 (날짜, 사진, 122자 일기)
   - 3번: 이미지+핀+점수 (위험요소 표시된 사진, 점수)
   - 4번: Bad 피드백 + 추천제품 (위험/주의 항목 3개, 제품 3개)
   - 5번: Good 피드백 + 양총평 (잘한점 3개, 50자 총평)
   - 6번: CTA 고정 이미지

3. **AI 프롬프트 확장**
   - Gemini AI가 `cardNews` 객체 생성하도록 프롬프트 추가
   - 카드뉴스용 텍스트: goal, momsDiary, badItems, goodItems, summary
   - 친근한 어투, 글자수 제한 적용

4. **신규 파일**
   - `lib/placid.server.ts` - Placid API 연동 모듈
   - `lib/card-image.server.ts` - HCTI 연동 (HTML→이미지)
   - `api/cardnews.tsx` - 카드뉴스 생성 API 엔드포인트

5. **수정된 파일**
   - `gemini.server.ts` - cardNews 생성 프롬프트 추가
   - `sleep-analysis.server.ts` - cardNews DB 저장 추가
   - `schema.ts` - CardNewsText 인터페이스 추가
   - `analyze-public.tsx`, `analyze.tsx`, `result.tsx` - /cardnews API 호출로 변경

### 환경변수 (추가)
```
PLACID_API_TOKEN=placid-ggzjvfrflt9yhiwh-zfrubcofjutsfpqi
HCTI_USER_ID=01KD2D75FEJSEXV489N6NFJK2T
HCTI_API_KEY=019b44d3-95ee-7328-a334-9d26cb9c19b9
```

### Placid 템플릿 UUID
- 1번 썸네일: `n98pmokubncg8`
- 2번 엄마일기: `lwq9uwrizrxht`
- 3번 이미지+핀: `tifs0gpwsoynn`
- 4번 Bad피드백: `q1mdgdcdymxnz`
- 5번 Good피드백: `wl2vnbyjwl425`
- 6번 CTA: 고정 이미지 URL

### 테스트 방법
1. 수면 분석 페이지에서 새 분석 진행
2. 분석 완료 후 "이미지로 저장하기" 버튼 클릭
3. Placid API가 6장 카드뉴스 생성
4. 이미지 다운로드

---

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


