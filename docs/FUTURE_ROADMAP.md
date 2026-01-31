# 🚀 향후 확장 로드맵

## Phase 1: 재고 관리 시스템 ✅ (완료)
- [x] PlayAuto API 연동
- [x] Supabase 데이터베이스 구축
- [x] 실시간 재고 모니터링 대시보드
- [x] 자동/수동 동기화 기능
- [x] 재고 부족/품절 알림

---

## Phase 2: 주문 관리 시스템 (예정)

### 2-1. 멀티 채널 주문 통합
**목표**: 모든 판매 채널의 주문을 한 곳에서 관리

**연동 채널**:
- 쿠팡 주문 API
- 스마트스토어 주문 API
- 자사몰 주문 데이터
- 기타 플랫폼 (11번가, 옥션 등)

**주요 기능**:
- 실시간 주문 수집 및 동기화
- 주문 상태 자동 업데이트
- 배송 준비 중/배송 완료 추적
- 반품/교환 관리
- 주문서 자동 출력

**데이터베이스 테이블**:
```sql
-- orders (주문 마스터)
- order_id, channel, order_date, customer_name, total_amount, status

-- order_items (주문 상세)
- order_id, product_id, sku, quantity, price

-- shipping_info (배송 정보)
- order_id, tracking_number, carrier, status
```

**예상 소요 기간**: 2-3주

---

## Phase 3: 광고 통합 대시보드 (예정)

### 3-1. 광고 성과 모니터링
**목표**: 모든 광고 채널의 성과를 실시간으로 한눈에 확인

**연동 채널**:
- Meta Ads (Facebook/Instagram)
- 쿠팡 광고 센터
- 네이버 광고 (스마트스토어)
- Google Ads (향후)

**주요 기능**:
- 실시간 광고비 지출 추적
- ROAS, CTR, CPC 자동 계산
- 일/주/월 성과 비교 차트
- 채널별 성과 순위
- 예산 초과 알림
- 자동 보고서 생성

**데이터베이스 테이블**:
```sql
-- ad_campaigns (캠페인 마스터)
- campaign_id, channel, name, budget, status

-- ad_performance (광고 성과)
- date, campaign_id, spend, revenue, impressions, clicks, conversions

-- ad_alerts (알림)
- alert_type, message, triggered_at
```

**대시보드 UI**:
- 채널별 성과 카드
- 실시간 ROAS 차트
- 예산 소진율 게이지
- 베스트/워스트 캠페인 랭킹

**예상 소요 기간**: 3-4주

---

## Phase 4: 통합 분석 시스템 (예정)

### 4-1. 비즈니스 인텔리전스
**목표**: 재고-주문-광고 데이터를 종합 분석하여 인사이트 도출

**주요 기능**:
- **재고 회전율 분석**
  - SKU별 판매 속도
  - 재고 부족으로 인한 기회 손실 추정
  - 최적 재고 수준 제안

- **주문 트렌드 분석**
  - 시간대별/요일별 주문 패턴
  - 채널별 매출 비중
  - 고객 재구매율

- **광고 효율성 분석**
  - 광고비 대비 주문 전환율
  - 채널별 고객 획득 비용 (CAC)
  - 생애 가치 (LTV) 추정

- **통합 리포트**
  - 주간/월간 경영 보고서 자동 생성
  - PDF/Excel 내보내기
  - 이메일 자동 발송

**예상 소요 기간**: 2-3주

---

## Phase 5: AI 기반 예측 및 자동화 (미래)

### 5-1. 수요 예측
- 과거 판매 데이터 기반 재고 수요 예측
- 시즌/이벤트 고려한 발주 제안
- 품절 위험 조기 경고

### 5-2. 광고 최적화
- AI 기반 광고 예산 자동 조정
- 성과 저조 캠페인 자동 중지
- 고성과 캠페인 자동 확대

### 5-3. 가격 최적화
- 경쟁사 가격 모니터링
- 최적 가격 제안
- 프로모션 효과 분석

---

## 🔧 기술 스택 확장 계획

### 현재 (Phase 1)
- **데이터베이스**: Supabase (PostgreSQL)
- **백엔드**: Supabase Edge Functions (Deno)
- **프론트엔드**: Vanilla JavaScript
- **호스팅**: Vercel

### 향후 확장
- **프론트엔드**: React + TypeScript 마이그레이션
- **차트**: Chart.js 또는 Recharts
- **알림**: 슬랙/이메일/카카오톡 연동
- **보고서**: PDF 생성 라이브러리
- **AI/ML**: Python + TensorFlow (수요 예측)

---

## 📱 앱 분리 배포 계획 (신규)

### 현재 구조
```
supaplate-master/
└── app/
    ├── /customer/*     # 고객용 (서비스허브, 보증서, 수면분석, 마이페이지)
    └── /dashboard/*    # 관리자용 (재고, 주문, 보증서 승인, 블로그 관리)
```

### 목표 구조: Monorepo 분리

```
sundayhug/
├── packages/
│   └── shared/                 # 공통 코드
│       ├── components/         # 공유 UI 컴포넌트 (Button, Card 등)
│       ├── lib/               # Supabase 클라이언트, 유틸리티
│       └── types/             # 공통 타입 정의
│
├── apps/
│   ├── customer/              # 고객용 앱 ⭐
│   │   ├── app/
│   │   │   ├── features/customer/
│   │   │   ├── features/warranty/public/
│   │   │   ├── features/sleep-analysis/
│   │   │   └── features/chat/
│   │   └── package.json
│   │
│   └── dashboard/             # 관리자용 앱 ⭐
│       ├── app/
│       │   ├── features/inventory/
│       │   ├── features/orders/
│       │   ├── features/warranty/admin/
│       │   └── features/blog/admin/
│       └── package.json
│
├── package.json               # 워크스페이스 루트
├── pnpm-workspace.yaml
└── turbo.json                 # Turborepo 설정
```

### 배포 구성

| 앱 | 도메인 | 플랫폼 | 대상 |
|----|--------|--------|------|
| **Customer** | `sundayhug.com` | Vercel | 일반 고객 |
| **Dashboard** | `admin.sundayhug.com` | Vercel (별도) | 내부 관리자 |
| **Supabase** | - | 공통 | 백엔드 공유 |

### 분리 이유

1. **보안 강화**: 고객이 관리자 코드/UI 구조를 볼 수 없음
2. **성능 최적화**: 각 앱의 번들 크기 감소 (불필요한 코드 제거)
3. **독립적 배포**: 고객앱 수정 시 관리자앱 영향 없음
4. **앱 출시 준비**: 고객용 앱만 PWA/네이티브 앱으로 전환 용이

### 앱 출시 전략

| 방식 | 적용 대상 | 설명 |
|------|----------|------|
| **PWA** | Customer 앱 | 앱스토어 없이 홈화면 설치, 가장 빠름 |
| **Capacitor** | Customer 앱 | iOS/Android 앱스토어 배포 필요시 |
| **웹 유지** | Dashboard 앱 | 관리자용이므로 웹으로 충분 |

### 마이그레이션 단계

**Step 1: 공통 패키지 분리** (1주)
- Supabase 클라이언트, 유틸리티 함수 추출
- 공통 UI 컴포넌트 (Button, Card, Input 등) 분리
- 공통 타입 정의 추출

**Step 2: 앱 분리** (1주)
- Customer 앱 생성 및 관련 features 이동
- Dashboard 앱 생성 및 관련 features 이동
- 라우팅 설정 분리

**Step 3: 배포 설정** (2-3일)
- Vercel 프로젝트 2개 생성
- 도메인 연결 (sundayhug.com, admin.sundayhug.com)
- 환경 변수 설정

**Step 4: PWA 설정** (Customer 앱) (2-3일)
- vite-plugin-pwa 설정
- manifest.json, Service Worker 구성
- 오프라인 캐싱 설정

### 예상 일정
- **총 소요 기간**: 2-3주
- **우선순위**: 서비스 출시 전 또는 사용자 증가 전 진행 권장

---

## 📅 개발 일정 (예상)

| Phase | 기능 | 예상 기간 | 시작 예정일 |
|-------|------|----------|-----------|
| Phase 1 | 재고 관리 | 2주 | ✅ 완료 |
| Phase 2 | 주문 관리 | 3주 | TBD |
| Phase 3 | 광고 대시보드 | 4주 | TBD |
| Phase 4 | 통합 분석 | 3주 | TBD |
| Phase 5 | AI 예측 | 8주+ | 2026년 |

---

## 💰 예상 비용

### 현재 운영 비용 (Phase 1)
- **Supabase**: 무료 (Free Tier) - 월 50만 건 조회까지 무료
- **Vercel**: 무료 (Hobby Plan)
- **총 비용**: $0/월

### 확장 후 예상 비용 (Phase 2-3)
- **Supabase**: $25/월 (Pro Plan) - 더 많은 API 호출
- **Vercel**: $20/월 (Pro Plan) - 더 빠른 성능
- **API 비용**: ~$10/월 (외부 API 호출)
- **총 비용**: ~$55/월

### 대규모 확장 시 (Phase 4-5)
- **Supabase**: $100-200/월
- **호스팅**: $50/월
- **AI 서비스**: $100/월
- **총 비용**: ~$250-350/월

---

## 🎯 우선순위

사용자의 비즈니스 니즈에 따라 우선순위 조정 가능:

### 옵션 A: 운영 효율화 우선
1. 재고 관리 (완료)
2. 주문 관리
3. 통합 분석
4. 광고 대시보드

### 옵션 B: 마케팅 성과 우선
1. 재고 관리 (완료)
2. 광고 대시보드
3. 주문 관리
4. 통합 분석

---

## 📝 다음 단계 결정

Phase 2로 진행하기 전에 결정이 필요한 사항:

1. **어떤 기능을 먼저 추가하고 싶으신가요?**
   - [ ] 주문 관리
   - [ ] 광고 대시보드
   - [ ] 기타

2. **연동하고 싶은 플랫폼은?**
   - [ ] 쿠팡
   - [ ] 스마트스토어
   - [ ] 자사몰
   - [ ] Meta Ads
   - [ ] 기타

3. **예산 범위는?**
   - [ ] 무료 (현재 유지)
   - [ ] ~$50/월
   - [ ] ~$100/월
   - [ ] 제한 없음

---

**현재 완성된 재고 관리 시스템이 안정적으로 작동하는지 확인한 후,  
다음 단계로 진행하는 것을 권장합니다!** ✅


