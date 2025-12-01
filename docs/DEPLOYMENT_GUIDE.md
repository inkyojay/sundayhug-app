# 🚀 배포 가이드 (코딩 비전문가용)

## 📋 준비물 체크리스트

시작하기 전에 아래 정보들을 준비하세요:

- [ ] Supabase 계정 및 프로젝트
- [ ] PlayAuto API 토큰
- [ ] PlayAuto API 엔드포인트 URL
- [ ] 컴퓨터 (Mac 또는 Windows)

---

## Step 1: Supabase 데이터베이스 설정 (5분)

### 1-1. Supabase 로그인
1. [https://supabase.com](https://supabase.com) 접속
2. 로그인 또는 회원가입
3. 프로젝트 선택 (또는 새 프로젝트 생성)

### 1-2. 데이터베이스 초기화
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭
3. 다음 파일의 내용을 복사해서 붙여넣기:
   ```
   /Users/inkyo/Desktop/내부 관리 프로그램 제작/supabase/migrations/001_initial_schema.sql
   ```
4. 우측 하단의 **RUN** 버튼 클릭
5. "Success" 메시지 확인

### 1-3. API 키 확인
1. 왼쪽 메뉴에서 **Settings** → **API** 클릭
2. 다음 2가지 정보를 메모장에 복사:
   - **Project URL**: `https://xxxxx.supabase.co` 형태
   - **anon public key**: `eyJhbGciOi...` 형태 (긴 문자열)
   - **service_role key**: `eyJhbGciOi...` 형태 (긴 문자열, secret)

---

## Step 2: Edge Function 배포 (10분)

### 2-1. Supabase CLI 설치

**Mac 사용자:**
1. 터미널(Terminal) 앱 실행
2. 아래 명령어 복사 후 붙여넣기 (Enter)
   ```bash
   brew install supabase/tap/supabase
   ```

**Windows 사용자:**
1. PowerShell 관리자 권한으로 실행
2. 아래 명령어 복사 후 붙여넣기 (Enter)
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

### 2-2. Supabase 로그인
터미널/PowerShell에서:
```bash
supabase login
```
→ 브라우저가 열리면 로그인 승인

### 2-3. 프로젝트 연결
```bash
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"
supabase link --project-ref YOUR_PROJECT_ID
```
> **YOUR_PROJECT_ID**: Supabase URL에서 `https://` 뒤의 영문자 (예: `abcdefgh`)

### 2-4. Edge Function 배포
```bash
supabase functions deploy sync-inventory --no-verify-jwt
```
→ "Deployed successfully" 메시지 확인

### 2-5. 환경 변수 설정
1. Supabase 대시보드 → **Edge Functions** 메뉴
2. `sync-inventory` 함수 클릭
3. **Settings** 탭 클릭
4. **Add new secret** 버튼으로 아래 2개 추가:
   - `PLAYAUTO_API_TOKEN`: PlayAuto 토큰 입력
   - `PLAYAUTO_API_URL`: PlayAuto API URL 입력

---

## Step 3: 자동 스케줄링 설정 (5분)

### 3-1. pg_cron 확장 활성화
1. Supabase → **Database** → **Extensions**
2. `pg_cron` 검색 → **Enable** 버튼 클릭

### 3-2. 스케줄 등록
1. **SQL Editor** → **New query**
2. 아래 SQL 복사 후 실행 (YOUR_SUPABASE_URL과 YOUR_SERVICE_ROLE_KEY 교체 필요):

```sql
-- 오전 9시 자동 동기화 (UTC 0시 = KST 9시)
SELECT cron.schedule(
  'sync-inventory-morning',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/sync-inventory',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "auto"}'::jsonb
  );
  $$
);

-- 오후 6시 자동 동기화 (UTC 9시 = KST 18시)
SELECT cron.schedule(
  'sync-inventory-evening',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/sync-inventory',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"trigger": "auto"}'::jsonb
  );
  $$
);
```

3. **RUN** 버튼 클릭

### 3-3. 스케줄 확인
```sql
SELECT * FROM cron.job;
```
→ 2개 row가 나오면 성공!

---

## Step 4: 웹 대시보드 설정 (3분)

### 4-1. config.js 파일 수정
1. 다음 파일을 텍스트 에디터로 열기:
   ```
   /Users/inkyo/Desktop/내부 관리 프로그램 제작/dashboard/config.js
   ```

2. 아래 3개 값을 본인의 Supabase 정보로 교체:
   ```javascript
   url: 'https://xxxxx.supabase.co',  // Step 1-3에서 복사한 URL
   anonKey: 'eyJhbGciOi...',          // Step 1-3에서 복사한 anon key
   syncFunctionUrl: 'https://xxxxx.supabase.co/functions/v1/sync-inventory',
   ```

3. 저장 (Cmd+S 또는 Ctrl+S)

### 4-2. 로컬에서 테스트
터미널에서:
```bash
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작/dashboard"
python3 -m http.server 8000
```

브라우저에서 접속: [http://localhost:8000](http://localhost:8000)

---

## Step 5: 웹 호스팅 (Vercel 무료) (5분)

### 5-1. Vercel 회원가입
1. [https://vercel.com](https://vercel.com) 접속
2. GitHub 계정으로 로그인 (또는 이메일 가입)

### 5-2. 프로젝트 배포
1. **New Project** 버튼 클릭
2. **Browse** 클릭 → `dashboard` 폴더 선택
3. **Deploy** 버튼 클릭
4. 배포 완료되면 URL 복사 (예: `https://yourproject.vercel.app`)

### 5-3. 완료! 🎉
이제 어디서든 접속 가능합니다!

---

## ✅ 최종 테스트

### 1. 수동 동기화 테스트
1. 배포된 웹사이트 접속
2. **재고 동기화** 버튼 클릭
3. "동기화 완료" 메시지 확인
4. 재고 데이터가 화면에 표시되는지 확인

### 2. 실시간 업데이트 테스트
1. 웹사이트를 2개 탭으로 열기
2. 한쪽에서 **재고 동기화** 버튼 클릭
3. 다른 탭에서도 자동으로 데이터가 업데이트되는지 확인

---

## 🆘 문제 해결

### "데이터를 불러올 수 없습니다"
→ config.js 파일의 URL과 Key가 올바른지 확인

### "재고 동기화 실패"
→ Supabase Edge Function의 환경 변수 (PlayAuto 토큰) 확인

### "Table 'inventory_summary' does not exist"
→ Step 1-2의 SQL 스크립트를 다시 실행

### 자동 동기화가 작동하지 않음
→ Step 3-2의 SQL에서 URL과 Service Role Key가 올바른지 확인

---

## 📞 추가 지원

문제가 해결되지 않으면:
1. Supabase → **Logs** 메뉴에서 에러 확인
2. 브라우저 개발자 도구 (F12) → Console 탭에서 에러 확인
3. Edge Functions → sync-inventory → Logs에서 에러 확인

---

**축하합니다! 재고 관리 시스템이 완성되었습니다** 🎉

이제 매일 오전 9시, 오후 6시에 자동으로 재고가 동기화되며,  
필요할 때 수동으로도 동기화할 수 있습니다.


