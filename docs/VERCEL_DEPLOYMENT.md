# 🚀 Vercel 배포 가이드

**썬데이허그 내부 관리 시스템 - Vercel 배포 방법**

---

## 📋 배포 전 체크리스트

### ✅ 완료된 사항
- [x] GitHub 레포지토리 생성 완료
- [x] Supabase 프로젝트 설정 완료
- [x] PlayAuto API 연동 완료
- [x] 로컬 대시보드 테스트 완료

### ⏳ 배포 전 확인 필요
- [ ] `dashboard/config.js`에 Supabase URL/Key 확인
- [ ] GitHub에 최신 코드 푸시 확인
- [ ] Vercel 계정 준비

---

## 🎯 배포 방법 (초간단!)

### 1단계: Vercel 접속
```
https://vercel.com
```
- GitHub 계정으로 로그인

### 2단계: 프로젝트 Import
1. **"Add New..." → "Project"** 클릭
2. GitHub 레포지토리 검색: `sundayhug-dashboard`
3. **"Import"** 클릭

### 3단계: 프로젝트 설정
```
Framework Preset: Other (또는 Vanilla JS)
Root Directory: ./ (기본값)
Build Command: (비워두기)
Output Directory: dashboard
```

### 4단계: 배포!
- **"Deploy"** 버튼 클릭
- 30초 후 완료! 🎉

---

## 🌐 배포 후 URL

```
https://sundayhug-dashboard.vercel.app
```
또는
```
https://sundayhug-dashboard-{사용자명}.vercel.app
```

---

## 🔄 자동 배포 설정

### GitHub Push → 자동 배포
```bash
# 로컬에서 코드 수정
git add .
git commit -m "대시보드 UI 개선"
git push

# 30초 후 Vercel에 자동 배포 완료! ✅
```

---

## 🔧 Vercel 설정 파일

### `vercel.json`
```json
{
  "version": 2,
  "name": "sundayhug-dashboard",
  "builds": [
    {
      "src": "dashboard/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/dashboard/$1"
    }
  ]
}
```

---

## 🔐 환경 변수 (필요 없음!)

Supabase URL과 Anon Key는 **공개 키**이므로 `config.js`에 직접 넣어도 안전합니다.

**보안이 필요한 키**:
- ✅ `SUPABASE_SERVICE_ROLE_KEY` → Supabase Functions에만 저장됨 (안전)
- ✅ `PLAYAUTO_API_KEY` → Supabase Functions에만 저장됨 (안전)
- ✅ `PLAYAUTO_EMAIL/PASSWORD` → Supabase Functions에만 저장됨 (안전)

**브라우저에 노출되는 키** (안전):
- ✅ `SUPABASE_URL` → 공개 URL
- ✅ `SUPABASE_ANON_KEY` → 공개 키 (Row Level Security로 보호됨)

---

## 📱 배포 후 확인 사항

### 1. 대시보드 접속 확인
```
https://your-app.vercel.app
```

### 2. 재고 데이터 로딩 확인
- 테이블에 데이터가 표시되는지 확인
- "재고 동기화" 버튼 작동 확인

### 3. Supabase 연결 확인
- 브라우저 콘솔(F12) 에러 확인
- Network 탭에서 API 호출 확인

---

## 🐛 문제 해결

### 문제 1: "Failed to fetch" 에러
**원인**: CORS 문제
**해결**:
1. Supabase Dashboard 접속
2. Settings → API → CORS
3. Vercel URL 추가: `https://your-app.vercel.app`

### 문제 2: 빈 화면
**원인**: 파일 경로 문제
**해결**:
```json
// vercel.json 확인
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/dashboard/$1"
    }
  ]
}
```

### 문제 3: 스타일 안 나옴
**원인**: CSS 경로 문제
**해결**:
```html
<!-- index.html에서 상대 경로 확인 -->
<link rel="stylesheet" href="./styles.css">
<script src="./config.js"></script>
<script src="./app.js"></script>
```

---

## 🎨 커스텀 도메인 (선택사항)

### 1. 도메인이 있다면
```
Vercel Dashboard
→ Settings
→ Domains
→ Add Domain
→ sundayhug.com
```

### 2. 무료 Vercel 도메인 사용
```
https://sundayhug-dashboard.vercel.app
```

---

## 📊 Vercel vs Railway

| 항목 | Vercel | Railway |
|------|--------|---------|
| 가격 | 무료 | 월 $5~ |
| 속도 | ⚡⚡⚡ 초고속 (CDN) | ⚡ 빠름 |
| 배포 | 30초 | 1~2분 |
| 용도 | 정적 사이트 최적화 | 서버 앱 |
| 대시보드 | ✅ 완벽 | ✅ 가능 |

**우리 프로젝트**: 정적 대시보드이므로 **Vercel이 완벽**! ✅

---

## 🚀 다음 단계

1. **Vercel 배포 완료** → 실제 URL 확인
2. **팀원들과 공유** → 어디서든 접속 가능
3. **자동 동기화 설정** → 하루 2번 자동 실행
4. **대시보드 개선** → UI/UX 업그레이드

---

## 💡 팁

### 빠른 배포 체크
```bash
# GitHub에 푸시만 하면 자동 배포!
git add .
git commit -m "fix: 버튼 색상 변경"
git push

# Vercel이 자동으로 감지하고 배포 시작
# 30초 후 https://your-app.vercel.app 업데이트 완료!
```

### Vercel CLI (선택사항)
```bash
# Vercel CLI 설치
npm i -g vercel

# 터미널에서 바로 배포
cd "/Users/inkyo/Desktop/내부 관리 프로그램 제작"
vercel

# 프로덕션 배포
vercel --prod
```

---

**배포 준비 완료!** 🎉

**다음 명령어**: "Vercel 배포하자" 또는 "배포 도와줘"



