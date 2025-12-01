# 🚀 설치 및 배포 가이드

## Step 1: Supabase 데이터베이스 설정

### 1-1. Supabase SQL Editor에서 실행
Supabase 대시보드 → SQL Editor → New Query 에서 아래 SQL 실행

```sql
-- supabase/migrations/001_initial_schema.sql 파일의 내용을 복사해서 실행
```

### 1-2. 확인 방법
- Table Editor에서 `products`, `inventory`, `sync_logs` 테이블이 생성되었는지 확인
- Functions 탭에서 `sync_inventory_cron` 함수 확인

---

## Step 2: Edge Function 배포

### 2-1. Supabase CLI 설치 (Mac 기준)
터미널에서 실행:
```bash
brew install supabase/tap/supabase
```

### 2-2. Supabase 프로젝트 연결
```bash
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"
supabase login
supabase link --project-ref YOUR_PROJECT_ID
```

### 2-3. Edge Function 배포
```bash
supabase functions deploy sync-inventory --no-verify-jwt
```

### 2-4. Edge Function에 환경 변수 설정
Supabase 대시보드 → Edge Functions → sync-inventory → Settings에서:
- `PLAYAUTO_API_TOKEN`: PlayAuto API 토큰 입력
- `PLAYAUTO_API_URL`: PlayAuto API 엔드포인트 입력

---

## Step 3: 자동 스케줄링 설정

### 3-1. pg_cron 확장 활성화
Supabase 대시보드 → Database → Extensions에서 `pg_cron` 활성화

### 3-2. 스케줄 등록 (SQL Editor에서 실행)
```sql
-- 하루 2번 실행 (오전 9시, 오후 6시 KST)
SELECT cron.schedule(
  'sync-inventory-morning',
  '0 0 * * *',  -- UTC 0시 = KST 9시
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/sync-inventory',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "auto"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'sync-inventory-evening',
  '0 9 * * *',  -- UTC 9시 = KST 18시
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/sync-inventory',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "auto"}'::jsonb
  );
  $$
);
```

### 3-3. 스케줄 확인
```sql
SELECT * FROM cron.job;
```

---

## Step 4: 웹 대시보드 배포

### 4-1. Vercel 배포 (추천)
1. [Vercel](https://vercel.com) 계정 생성/로그인
2. `New Project` 클릭
3. `Import Git Repository` 또는 직접 업로드
4. 환경 변수 설정:
   - `VITE_SUPABASE_URL`: Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key
5. Deploy 버튼 클릭

### 4-2. 로컬에서 테스트
```bash
cd dashboard
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속

---

## Step 5: 최종 테스트

### 5-1. 수동 동기화 테스트
1. 웹 대시보드 접속
2. "재고 동기화" 버튼 클릭
3. 로딩 후 재고 데이터 확인

### 5-2. 자동 동기화 확인
다음날 오전 9시/오후 6시에 자동 실행 확인
```sql
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🆘 문제 해결

### Edge Function 오류 시
```bash
supabase functions logs sync-inventory
```

### 데이터베이스 연결 오류 시
- Supabase 프로젝트가 활성 상태인지 확인
- API 키가 올바른지 확인
- Row Level Security (RLS) 설정 확인

### PlayAuto API 연결 오류 시
- API 토큰이 유효한지 확인
- API 엔드포인트 URL 확인
- PlayAuto 계정 권한 확인

---

## 📞 추가 지원
문제 발생 시 다음 정보와 함께 문의:
1. 에러 메시지
2. Supabase Edge Function 로그
3. 브라우저 개발자 도구 Console 로그


