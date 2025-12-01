# 썬데이허그 내부 관리 시스템

## 📌 프로젝트 개요
PlayAuto 재고 관리 API를 Supabase와 연동하여 실시간 재고 현황을 모니터링하는 통합 관리 시스템

## 🎯 현재 구현 기능 (Phase 1)
- ✅ PlayAuto API 연동 (토큰 인증)
- ✅ Supabase 데이터베이스 자동 동기화
- ✅ 전체 재고 자동 조회 (350+ SKU 페이지네이션 지원)
- ✅ 수동 트리거 버튼 (웹 대시보드)
- ✅ 실시간 재고 현황 모니터링
- ✅ **노션 연동 (Parent SKU + Solo SKU 관리)**
- ✅ Railway 배포 준비 완료

## 🚀 향후 확장 계획
- Phase 2: 주문 관리 시스템
- Phase 3: 광고 대시보드 (Meta Ads, 쿠팡, 스마트스토어)
- Phase 4: 통합 분석 및 자동 보고서

## 📁 프로젝트 구조
```
/내부 관리 프로그램 제작/
├── README.md                    # 프로젝트 설명서
├── RAILWAY_DEPLOYMENT.md        # Railway 배포 가이드
├── SETUP_GUIDE.md              # 설치 가이드
├── package.json                # Railway 배포 설정
├── railway.json                # Railway 빌드 설정
├── supabase/
│   ├── migrations/             # 데이터베이스 마이그레이션
│   │   └── 001_initial_schema.sql
│   └── functions/              # Edge Functions
│       ├── get-playauto-token/ # 토큰 발급 함수
│       └── sync-inventory-simple/ # 재고 동기화 함수
├── dashboard/                   # 웹 대시보드
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── config.js
└── config/
    └── playauto-api-example.json
```

## 🔧 기술 스택
- **데이터베이스**: Supabase (PostgreSQL)
- **백엔드**: Supabase Edge Functions (Deno)
- **프론트엔드**: HTML + JavaScript (Vanilla)
- **배포**: Railway (GitHub 자동 배포)
- **스케줄링**: Supabase pg_cron
- **API 연동**: PlayAuto REST API

## 📊 데이터베이스 구조

### parent_products (제품 분류 - 노션 연동)
- id: UUID (Primary Key)
- parent_sku: VARCHAR (상위 제품 SKU)
- product_name: VARCHAR (제품명)
- category: VARCHAR (카테고리)
- subcategory: VARCHAR (서브카테고리)
- description: TEXT (설명)
- notion_page_id: VARCHAR (노션 페이지 ID)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

### products (Solo SKU - PlayAuto + 노션 연동)
- id: UUID (Primary Key)
- sku: VARCHAR (고유 SKU 코드)
- product_name: VARCHAR (제품명)
- parent_sku: VARCHAR (parent_products 참조)
- notion_page_id: VARCHAR (노션 페이지 ID)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

### inventory (재고 현황 - PlayAuto 연동)
- id: UUID (Primary Key)
- product_id: UUID (products 참조)
- sku: VARCHAR
- current_stock: INTEGER (현재 재고)
- previous_stock: INTEGER (이전 재고)
- stock_change: INTEGER (재고 변동)
- synced_at: TIMESTAMP (동기화 시각)

### sync_logs (PlayAuto 동기화 로그)
- id: UUID (Primary Key)
- sync_type: VARCHAR (auto/manual)
- status: VARCHAR (success/error)
- items_synced: INTEGER
- error_message: TEXT
- created_at: TIMESTAMP

### notion_sync_logs (노션 동기화 로그)
- id: UUID (Primary Key)
- sync_type: VARCHAR (parent_products/solo_products)
- status: VARCHAR (success/error/partial)
- items_synced: INTEGER
- items_failed: INTEGER
- error_message: TEXT
- duration_ms: INTEGER
- created_at: TIMESTAMP

## 🔐 필요한 환경 변수

### PlayAuto 연동
```
PLAYAUTO_API_KEY=your_playauto_api_key
PLAYAUTO_EMAIL=your_email
PLAYAUTO_PASSWORD=your_password
```

### Supabase
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 노션 연동 (선택사항)
```
NOTION_API_KEY=secret_your_notion_integration_token
NOTION_PARENT_PRODUCTS_DB_ID=parent_products_database_id
NOTION_SOLO_PRODUCTS_DB_ID=solo_products_database_id
```

## 🚀 배포 가이드

### 빠른 시작
1. GitHub 레포지토리 생성 및 코드 업로드
2. Railway에서 GitHub 레포 연결
3. 자동 배포 완료

**자세한 가이드**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) 참고

### 로컬 개발
```bash
# 프로젝트 클론
git clone https://github.com/YOUR_USERNAME/playauto-inventory-dashboard.git

# 로컬 서버 실행
cd playauto-inventory-dashboard
npx serve dashboard

# 변경사항 배포
git add .
git commit -m "업데이트"
git push  # Railway 자동 배포
```

---
**제작일**: 2025년 11월 12일  
**버전**: 1.0.0  
**담당자**: 썬데이허그 개발팀

