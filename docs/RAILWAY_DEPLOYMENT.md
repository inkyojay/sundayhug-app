# 🚀 Railway 배포 가이드

이 가이드는 PlayAuto 재고 관리 대시보드를 Railway에 배포하는 전체 과정을 설명합니다.

---

## 📋 준비사항

- [ ] GitHub 계정 (없으면 https://github.com 에서 무료 가입)
- [ ] Railway 계정 (없으면 https://railway.app 에서 GitHub로 로그인)
- [ ] Supabase 프로젝트 (이미 설정 완료)

---

## 1️⃣ GitHub 레포지토리 생성 및 코드 업로드

### 1-1. GitHub 레포지토리 만들기

1. https://github.com 접속 후 로그인
2. 오른쪽 상단 **+** 버튼 클릭 → **New repository** 선택
3. 레포지토리 정보 입력:
   - **Repository name**: `playauto-inventory-dashboard` (원하는 이름)
   - **Description**: PlayAuto 재고 관리 시스템
   - **Public** 또는 **Private** 선택 (Private 권장)
   - ❌ **"Initialize this repository with a README"** 체크 해제
4. **Create repository** 버튼 클릭

### 1-2. 로컬 프로젝트를 GitHub에 연결

터미널을 열고 다음 명령어를 **순서대로** 실행하세요:

```bash
# 프로젝트 폴더로 이동
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"

# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: PlayAuto 재고 관리 시스템"

# GitHub 레포지토리 연결 (아래 URL을 본인의 레포지토리 URL로 변경)
git remote add origin https://github.com/YOUR_USERNAME/playauto-inventory-dashboard.git

# main 브랜치로 변경
git branch -M main

# GitHub에 업로드
git push -u origin main
```

**⚠️ 주의**: `YOUR_USERNAME`을 본인의 GitHub 사용자명으로 변경하세요!

---

## 2️⃣ Railway에서 프로젝트 배포

### 2-1. Railway 프로젝트 생성

1. https://railway.app 접속
2. GitHub 계정으로 로그인
3. **New Project** 버튼 클릭
4. **Deploy from GitHub repo** 선택
5. GitHub 레포지토리 검색창에서 `playauto-inventory-dashboard` 검색 후 선택
   - 처음이면 **Configure GitHub App** 클릭하여 Railway에 GitHub 접근 권한 부여
6. 레포지토리 선택 후 **Deploy Now** 클릭

### 2-2. 배포 대기

- Railway가 자동으로 코드를 감지하고 배포를 시작합니다
- 빌드 로그에서 진행 상황을 확인할 수 있습니다
- 보통 2-3분 정도 소요됩니다

### 2-3. 배포 URL 확인

1. 배포가 완료되면 **Deployments** 탭에서 **View Logs** 확인
2. **Settings** 탭 → **Networking** 섹션
3. **Generate Domain** 버튼 클릭
4. 생성된 URL (예: `https://your-app.up.railway.app`) 클릭하여 대시보드 접속

---

## 3️⃣ 자동 배포 설정 확인

Railway는 기본적으로 **자동 배포**가 활성화되어 있습니다:

✅ GitHub에 코드를 push하면 → Railway가 자동으로 재배포
✅ 실시간 빌드 로그 확인 가능
✅ 배포 실패 시 이전 버전 자동 유지

**테스트 방법:**

1. 로컬에서 파일 수정 (예: `dashboard/index.html`)
2. 터미널에서 변경사항 업로드:
   ```bash
   cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"
   git add .
   git commit -m "대시보드 UI 개선"
   git push
   ```
3. Railway 대시보드에서 자동 배포 시작 확인
4. 배포 완료 후 URL 새로고침하여 변경사항 확인

---

## 4️⃣ 커스텀 도메인 연결 (선택사항)

본인의 도메인이 있다면 Railway에 연결할 수 있습니다:

1. Railway 프로젝트 → **Settings** → **Networking**
2. **Custom Domain** 섹션에서 도메인 입력
3. DNS 설정에서 CNAME 레코드 추가 (Railway가 안내해줍니다)

---

## 5️⃣ 로컬 개발 워크플로우

### 일상적인 작업 흐름:

1. **로컬에서 파일 수정**
   ```bash
   # 대시보드 파일 수정 (VS Code, 메모장 등 사용)
   # 예: dashboard/styles.css 수정
   ```

2. **로컬에서 테스트** (선택사항)
   ```bash
   cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"
   npx serve dashboard
   # 브라우저에서 http://localhost:3000 접속
   ```

3. **GitHub에 업로드**
   ```bash
   git add .
   git commit -m "변경 내용 설명"
   git push
   ```

4. **Railway에서 자동 배포 대기** (2-3분)

5. **배포 URL에서 확인**

---

## 🔧 문제 해결

### 배포가 실패하는 경우

1. Railway 대시보드 → **Deployments** → 실패한 배포 클릭
2. **View Logs** 클릭하여 에러 메시지 확인
3. 일반적인 원인:
   - `package.json` 파일 오류
   - PORT 환경변수 미설정 (자동으로 설정되므로 문제 없음)

### 대시보드가 빈 화면으로 나오는 경우

1. 브라우저 개발자 도구 (F12) → **Console** 탭 확인
2. Supabase 연결 오류인 경우:
   - `dashboard/config.js` 파일의 Supabase URL과 키 재확인
   - CORS 설정 확인 (Supabase는 기본적으로 모든 도메인 허용)

### GitHub push가 안되는 경우

1. GitHub 인증 확인:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

2. Personal Access Token 사용:
   - GitHub → Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - repo 권한 선택
   - 생성된 토큰을 비밀번호로 사용

---

## 📊 비용 안내

Railway 무료 플랜:
- ✅ 월 $5 크레딧 제공
- ✅ 정적 사이트 호스팅은 거의 무료 수준 (월 $1 미만)
- ✅ 트래픽 500GB까지 무료
- ✅ 자동 SSL 인증서

**예상 월 비용**: $1 미만 (이 대시보드의 경우)

---

## 🎯 다음 단계

배포 완료 후:

1. ✅ 대시보드 URL 북마크 저장
2. ✅ 팀원들에게 URL 공유
3. ✅ 필요시 커스텀 도메인 연결
4. ✅ 로컬에서 수정 → Push → 자동 배포 워크플로우 익히기

---

## 💡 유용한 팁

### 빠른 배포 명령어 (자주 사용)

```bash
# 변경사항 저장 및 배포
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"
git add .
git commit -m "업데이트"
git push
```

### Railway CLI 설치 (선택사항)

더 편한 배포를 원한다면:

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 로그 실시간 확인
railway logs
```

---

## 📞 도움이 필요하면

- Railway 문서: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub 가이드: https://docs.github.com

---

**🎉 축하합니다! Railway 배포가 완료되었습니다!**

이제 전 세계 어디서나 대시보드에 접속할 수 있습니다.


