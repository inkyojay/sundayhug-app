# 네이버 커머스 API 프록시 서버

네이버 커머스 API는 고정 IP에서만 호출이 가능합니다.
Vercel은 서버리스라 IP가 변동되므로, Railway에 이 프록시 서버를 배포하여 고정 IP를 확보합니다.

## 🚀 Railway 배포 방법

### 1. Railway 프로젝트 생성

```bash
# Railway CLI 설치 (없다면)
npm install -g @railway/cli

# 로그인
railway login

# naver-proxy 폴더로 이동
cd naver-proxy

# 새 프로젝트 생성 및 배포
railway init
railway up
```

### 2. 환경변수 설정 (Railway Dashboard)

Railway Dashboard에서 다음 환경변수를 설정하세요:

| 변수 | 필수 | 설명 |
|------|------|------|
| `NAVER_CLIENT_ID` | O | 네이버 커머스 앱 Client ID |
| `NAVER_CLIENT_SECRET` | O | 네이버 커머스 앱 Client Secret |
| `PROXY_API_KEY` | 권장 | 프록시 보안용 API 키 (임의 문자열) |

### 3. 고정 IP 설정

Railway Dashboard에서:
1. 프로젝트 선택
2. Settings → Networking
3. "Enable Public Network" 활성화
4. 생성된 URL 확인 (예: `naver-proxy-production-xxxx.railway.app`)

### 4. 네이버 커머스 API 센터에서 IP 등록

1. [네이버 커머스 API 센터](https://apicenter.commerce.naver.com) 접속
2. 애플리케이션 관리 → IP 관리
3. Railway 서버의 Outbound IP 등록

> Railway의 Outbound IP는 Railway Dashboard → Settings에서 확인 가능

## 🔧 Vercel 대시보드 설정

프록시 서버 배포 후, Vercel 환경변수에 추가:

```
NAVER_PROXY_URL=https://naver-proxy-production-xxxx.railway.app
NAVER_PROXY_API_KEY=your-secret-key  # PROXY_API_KEY와 동일
```

## 📡 API 엔드포인트

### 헬스체크
```
GET /health
```

### 토큰 발급
```
POST /api/token
Content-Type: application/json
X-Proxy-Api-Key: your-secret-key

{
  "client_id": "optional (env fallback)",
  "client_secret": "optional (env fallback)",
  "account_id": "optional"
}
```

### 주문 조회
```
GET /api/orders?lastChangedFrom=2024-01-01&lastChangedTo=2024-01-31
Authorization: Bearer {access_token}
X-Proxy-Api-Key: your-secret-key
```

### 상품 조회
```
GET /api/products?page=0&size=100
Authorization: Bearer {access_token}
X-Proxy-Api-Key: your-secret-key
```

### 범용 프록시
```
POST /api/proxy
Content-Type: application/json
X-Proxy-Api-Key: your-secret-key

{
  "method": "GET",
  "path": "/external/v1/pay-order/seller/orders",
  "headers": {
    "Authorization": "Bearer {access_token}"
  }
}
```

## 🔒 보안

- `PROXY_API_KEY` 설정으로 허가된 요청만 처리
- Railway에서 제공하는 Private Networking 활용 가능
- HTTPS 기본 제공

