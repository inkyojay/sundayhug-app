# ⚡ 빠른 시작 가이드 (5분 요약)

## 🎯 이 시스템은 무엇인가요?

PlayAuto의 재고 데이터를 **자동으로 가져와서** Supabase에 저장하고,  
**웹 대시보드**에서 실시간으로 확인할 수 있는 시스템입니다.

### 주요 기능
- ✅ 하루 2번 자동 재고 동기화 (오전 9시, 오후 6시)
- ✅ 언제든지 수동으로 동기화 가능 (버튼 클릭)
- ✅ 실시간 재고 현황 모니터링
- ✅ 재고 부족/품절 자동 감지
- ✅ 재고 변동 이력 추적

---

## 📁 파일 구조

```
/내부 관리 프로그램 제작/
│
├── 📄 README.md                      ← 프로젝트 전체 설명
├── 📄 QUICK_START.md                 ← 지금 보시는 파일 (빠른 시작)
├── 📄 DEPLOYMENT_GUIDE.md            ← 배포 가이드 (단계별 설명)
├── 📄 PLAYAUTO_API_GUIDE.md          ← PlayAuto API 연동 방법
├── 📄 FUTURE_ROADMAP.md              ← 향후 확장 계획
│
├── 📁 supabase/                      ← Supabase 관련 파일
│   ├── migrations/
│   │   └── 001_initial_schema.sql   ← 데이터베이스 테이블 생성 SQL
│   └── functions/
│       └── sync-inventory/
│           └── index.ts              ← PlayAuto 연동 Edge Function
│
├── 📁 dashboard/                     ← 웹 대시보드 (프론트엔드)
│   ├── index.html                    ← 메인 HTML
│   ├── app.js                        ← JavaScript 로직
│   ├── styles.css                    ← 스타일시트
│   └── config.js                     ← Supabase 설정 (수정 필요!)
│
└── 📁 config/
    └── playauto-api-example.json     ← PlayAuto API 응답 예제
```

---

## 🚀 3단계 설정 (처음 1회만)

### 1단계: Supabase 데이터베이스 생성 (5분)
1. [supabase.com](https://supabase.com) 로그인
2. SQL Editor에서 `001_initial_schema.sql` 실행
3. Settings → API에서 URL과 Key 복사

### 2단계: Edge Function 배포 (5분)
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy sync-inventory --no-verify-jwt
```

Edge Function에 환경 변수 설정:
- `PLAYAUTO_API_TOKEN`: PlayAuto 토큰
- `PLAYAUTO_API_URL`: PlayAuto API URL

### 3단계: 웹 대시보드 설정 (2분)
1. `dashboard/config.js` 파일 열기
2. Supabase URL과 Key 입력
3. 저장 후 브라우저에서 열기

---

## 💻 사용 방법

### 로컬에서 실행
```bash
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작/dashboard"
python3 -m http.server 8000
```
→ 브라우저에서 `http://localhost:8000` 접속

### 온라인 배포 (Vercel)
1. [vercel.com](https://vercel.com) 로그인
2. `dashboard` 폴더 업로드
3. Deploy 버튼 클릭

---

## 📊 대시보드 기능 설명

### 통계 카드
- **총 제품 수**: 전체 SKU 개수
- **정상 재고**: 충분한 재고가 있는 제품
- **재고 부족**: 알림 기준 이하인 제품 (기본 10개 이하)
- **품절**: 재고가 0인 제품

### 재고 동기화 버튼
- 클릭하면 즉시 PlayAuto에서 최신 재고 데이터를 가져옵니다
- 자동: 하루 2번 (오전 9시, 오후 6시)
- 수동: 버튼으로 언제든지 가능

### 재고 현황 테이블
- SKU별 현재 재고 수량
- 재고 변동량 (증가/감소)
- 마지막 업데이트 시간
- 상태 (정상/재고부족/품절)

### 검색 및 필터
- SKU 또는 제품명으로 검색
- 상태별 필터 (전체/정상/재고부족/품절)

### 동기화 기록
- 과거 동기화 이력 조회
- 성공/실패 여부
- 소요 시간

---

## 🔧 설정 변경

### 자동 동기화 시간 변경
파일: Supabase SQL Editor

오전 9시 → 오전 10시로 변경하려면:
```sql
-- 기존 스케줄 삭제
SELECT cron.unschedule('sync-inventory-morning');

-- 새 시간으로 등록 (UTC 1시 = KST 10시)
SELECT cron.schedule(
  'sync-inventory-morning',
  '0 1 * * *',
  $$ ... $$
);
```

### 재고 알림 기준 변경
파일: `supabase/migrations/001_initial_schema.sql`

기본값 10개 → 20개로 변경:
```sql
alert_threshold INTEGER DEFAULT 20,
```

---

## ❓ 자주 묻는 질문

### Q: 재고 데이터가 안 보여요
**A**: 
1. `config.js`에 올바른 Supabase URL/Key 입력했는지 확인
2. 브라우저 F12 → Console에서 에러 확인
3. "재고 동기화" 버튼 클릭해서 데이터 가져오기

### Q: 재고 동기화 버튼을 눌러도 안 돼요
**A**:
1. Supabase Edge Function이 배포되었는지 확인
2. Edge Function 환경 변수 (PlayAuto 토큰) 확인
3. Supabase → Edge Functions → sync-inventory → Logs 확인

### Q: PlayAuto API 연동이 안 돼요
**A**:
1. PlayAuto API 토큰이 유효한지 확인
2. API URL이 정확한지 확인
3. `PLAYAUTO_API_GUIDE.md` 파일 참고
4. Edge Function 코드에서 필드 매핑 수정 필요

### Q: 자동 동기화가 작동하지 않아요
**A**:
1. Supabase → Database → Extensions에서 `pg_cron` 활성화 확인
2. SQL Editor에서 `SELECT * FROM cron.job;` 실행해서 스케줄 확인
3. 다음날까지 기다린 후 `sync_logs` 테이블 확인

---

## 📞 도움이 필요하면?

### 1. 로그 확인
- **Edge Function 로그**: Supabase → Edge Functions → Logs
- **데이터베이스 로그**: Supabase → Logs → Postgres
- **브라우저 로그**: F12 → Console 탭

### 2. 상세 가이드 참고
- **배포**: `DEPLOYMENT_GUIDE.md`
- **PlayAuto 연동**: `PLAYAUTO_API_GUIDE.md`
- **전체 설명**: `README.md`

### 3. 데이터베이스 직접 확인
Supabase → Table Editor에서:
- `products`: 제품 목록
- `inventory`: 재고 현황
- `sync_logs`: 동기화 기록

---

## ✅ 체크리스트

설정이 완료되었다면:

- [ ] Supabase 프로젝트 생성됨
- [ ] 데이터베이스 테이블 생성됨 (products, inventory, sync_logs)
- [ ] Edge Function 배포됨 (sync-inventory)
- [ ] Edge Function 환경 변수 설정됨
- [ ] `config.js` 파일에 Supabase 정보 입력됨
- [ ] 웹 대시보드 접속 가능
- [ ] 재고 동기화 버튼 작동 확인
- [ ] 재고 데이터 정상 표시
- [ ] 자동 스케줄링 설정됨

**모두 체크되었다면 축하합니다! 시스템이 정상 작동 중입니다** 🎉

---

## 🚀 다음 단계

재고 관리 시스템이 안정적으로 작동하면:
- 주문 관리 시스템 추가
- 광고 대시보드 통합
- 통합 분석 리포트

자세한 내용은 `FUTURE_ROADMAP.md` 참고


