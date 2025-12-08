# 🏆 썬데이허그 멤버십 & 크레딧 시스템 기획

> 작성일: 2025년 12월 3일  
> 버전: 1.0

---

## 목차

1. [전체 시스템 구조](#1-전체-시스템-구조)
2. [등급 시스템](#2--등급-시스템)
3. [크레딧 시스템](#3--크레딧-시스템)
4. [후기 인증 프로세스](#4--후기-인증-프로세스)
5. [특별 리워드 프로그램](#5--특별-리워드-프로그램)
6. [DB 스키마 설계](#6--db-스키마-설계)
7. [구현 우선순위](#7--구현-우선순위)

---

## 1. 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    썬데이허그 멤버십                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   👤 회원                                                    │
│    ├── 🏅 등급 (구매/인증 횟수 기반)                          │
│    │    └── Basic → Silver → Gold → VIP → VVIP              │
│    │                                                         │
│    └── 💎 크레딧 (활동 보상 & 결제)                           │
│         └── AI 상담, 프리미엄 기능 이용                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 개념

- **등급**: 구매/활동 기반으로 자동 승급, 혜택 제공
- **크레딧**: 활동 보상 또는 결제로 획득, AI 상담 등 프리미엄 기능에 사용

---

## 2. 🏅 등급 시스템

### 2.1 등급 기준

| 등급 | 아이콘 | 조건 | 누적 포인트 |
|------|--------|------|------------|
| **Basic** | 🌱 | 회원가입 | 0점 |
| **Silver** | 🥈 | 2점 이상 | 2점 |
| **Gold** | 🥇 | 5점 이상 | 5점 |
| **VIP** | 💎 | 10점 이상 | 10점 |
| **VVIP** | 👑 | 20점 이상 | 20점 |

### 2.2 포인트 적립 기준

| 활동 | 포인트 | 비고 |
|------|--------|------|
| **보증서 등록 (ABC 침대)** | +3점 | 승인 시 |
| **구매 인증 (기타 제품)** | +1점 | 승인 시 |
| **맘카페 후기** | +2점 | 링크 인증 시 |
| **인스타그램 후기** | +2점 | 게시물 인증 시 |
| **블로그 후기** | +3점 | 링크 인증 시 |
| **친구 추천** | +1점 | 추천인 가입 시 |

### 2.3 등급별 혜택

| 혜택 | Basic | Silver | Gold | VIP | VVIP |
|------|-------|--------|------|-----|------|
| **무료 AI 상담** | 월 3회 | 월 5회 | 월 10회 | 월 20회 | 무제한 |
| **수면 분석** | 월 2회 | 월 5회 | 월 10회 | 무제한 | 무제한 |
| **A/S 우선 처리** | ❌ | ❌ | ✅ | ✅ | ✅ (최우선) |
| **신제품 얼리버드** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **전용 할인 쿠폰** | ❌ | 5% | 7% | 10% | 15% |
| **생일 선물** | ❌ | ❌ | 소품 | 중급 | 프리미엄 |
| **전용 이벤트** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **1:1 전담 상담** | ❌ | ❌ | ❌ | ❌ | ✅ |

### 2.4 등급 유지/강등 정책

- **유지 기간**: 등급 달성 후 12개월간 유지
- **갱신 조건**: 12개월 내 동일 조건 충족 시 유지
- **강등**: 갱신 조건 미충족 시 한 단계 강등 (단, Basic까지만)
- **재승급**: 언제든 조건 충족 시 즉시 승급

---

## 3. 💎 크레딧 시스템

### 3.1 크레딧 획득 방법

| 활동 | 크레딧 | 비고 |
|------|--------|------|
| **회원가입 보너스** | +50 | 최초 1회 |
| **보증서 등록 승인** | +30 | 제품당 |
| **구매 인증 승인** | +20 | 건당 |
| **맘카페 후기 인증** | +50 | 건당 |
| **인스타그램 후기 인증** | +40 | 건당 |
| **블로그 후기 인증** | +60 | 건당 |
| **수면 분석 공유** | +10 | SNS 공유 시 |
| **친구 추천 성공** | +30 | 추천인 가입 시 |
| **출석 체크** | +5 | 일 1회 |
| **연속 출석 7일** | +20 | 보너스 |

### 3.2 크레딧 사용처

| 서비스 | 크레딧 | 비고 |
|--------|--------|------|
| **AI 육아 상담** | 10 크레딧/회 | 무료 횟수 소진 후 |
| **프리미엄 수면 분석** | 20 크레딧/회 | 상세 리포트 |
| **전문가 1:1 상담 예약** | 100 크레딧/회 | 추후 기능 |
| **육아 클래스 수강** | 50~200 크레딧 | 추후 기능 |

### 3.3 크레딧 결제 (충전)

| 패키지 | 가격 | 크레딧 | 보너스 |
|--------|------|--------|--------|
| **스타터** | ₩3,900 | 50 | - |
| **베이직** | ₩9,900 | 150 | +10% |
| **스탠다드** | ₩19,900 | 350 | +17% |
| **프리미엄** | ₩49,900 | 1,000 | +25% |

### 3.4 크레딧 정책

- **유효기간**: 획득일로부터 12개월
- **환불**: 결제 크레딧은 미사용분에 한해 7일 이내 환불 가능
- **양도**: 불가
- **소멸 알림**: 만료 30일, 7일 전 카카오톡 알림

---

## 4. 📝 후기 인증 프로세스

### 4.1 후기 인증 플로우

```
1️⃣ 후기 작성 (맘카페/인스타/블로그)
       ↓
2️⃣ 앱에서 "후기 인증 신청"
       ↓
3️⃣ 링크/스크린샷 제출
       ↓
4️⃣ 관리자 검토 (1~2 영업일)
       ↓
5️⃣ 승인 → 크레딧 + 등급 포인트 지급
       ↓
6️⃣ 카카오톡 알림
```

### 4.2 후기 유형별 요구사항

#### 맘카페 후기
- **필수**: 게시물 링크
- **조건**: 
  - 사진 3장 이상 포함
  - 텍스트 200자 이상
  - 썬데이허그 제품 언급
  - 비공개 글 불가

#### 인스타그램 후기
- **필수**: 게시물 링크 또는 스크린샷
- **조건**:
  - @sundayhug_official 태그
  - #썬데이허그 해시태그
  - 제품 사진 포함
  - 공개 계정

#### 블로그 후기
- **필수**: 블로그 포스팅 링크
- **조건**:
  - 사진 5장 이상
  - 텍스트 500자 이상
  - 제품 상세 후기 포함
  - 공개 설정

### 4.3 후기 인증 화면 (앱) - 와이어프레임

```
┌─────────────────────────────────────┐
│        📝 후기 인증 신청             │
├─────────────────────────────────────┤
│                                      │
│  후기 유형 선택                       │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │맘카페 │ │인스타 │ │블로그 │         │
│  │ +50  │ │ +40  │ │ +60  │         │
│  └──────┘ └──────┘ └──────┘         │
│                                      │
│  후기 링크 *                          │
│  ┌─────────────────────────────┐    │
│  │ https://...                  │    │
│  └─────────────────────────────┘    │
│                                      │
│  스크린샷 첨부 (선택)                  │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 📷  │ │ 📷  │ │  +  │           │
│  └─────┘ └─────┘ └─────┘           │
│                                      │
│  ┌─────────────────────────────┐    │
│  │     후기 인증 신청하기        │    │
│  └─────────────────────────────┘    │
│                                      │
│  💡 승인 시 50 크레딧이 지급됩니다    │
│                                      │
└─────────────────────────────────────┘
```

### 4.4 거절 사유 예시

- 링크 접근 불가 (비공개, 삭제됨)
- 조건 미충족 (사진/글자수 부족)
- 타 브랜드 제품
- 중복 신청
- 부적절한 내용

---

## 5. 🎁 특별 리워드 프로그램

### 5.1 마일스톤 보상

| 마일스톤 | 보상 | 비고 |
|---------|------|------|
| 첫 보증서 등록 | 🎁 웰컴 키트 | 소품 세트 |
| 후기 3개 달성 | 🎁 100 크레딧 보너스 | 즉시 지급 |
| 후기 5개 달성 | 🎁 전용 할인 쿠폰 15% | 1회 사용 |
| 후기 10개 달성 | 🎁 전용 할인 쿠폰 20% | 1회 사용 |
| Silver 등급 달성 | 🎁 50 크레딧 보너스 | 즉시 지급 |
| Gold 등급 달성 | 🎁 썬데이허그 굿즈 | 선택 가능 |
| VIP 등급 달성 | 🎁 신제품 체험권 | 신제품 출시 시 |
| VVIP 등급 달성 | 🎁 연간 프리미엄 멤버십 | AI 상담 무제한 |

### 5.2 시즌 이벤트 (예시)

| 이벤트 | 기간 | 내용 |
|--------|------|------|
| **신년 이벤트** | 1월 | 크레딧 2배 적립 |
| **어린이날 이벤트** | 5월 | 등급 업그레이드 기준 50% 완화 |
| **여름 맞이** | 7월 | 후기 인증 크레딧 +50% |
| **추석 이벤트** | 9월 | 친구 추천 크레딧 2배 |
| **블랙프라이데이** | 11월 | 크레딧 충전 50% 보너스 |

### 5.3 생일 혜택

| 등급 | 생일 혜택 |
|------|----------|
| Basic | - |
| Silver | - |
| Gold | 썬데이허그 소품 1종 |
| VIP | 썬데이허그 제품 할인권 30% |
| VVIP | 썬데이허그 프리미엄 선물 세트 |

---

## 6. 📊 DB 스키마 설계

### 6.1 프로필 테이블 확장

```sql
-- 프로필 확장
ALTER TABLE profiles ADD COLUMN membership_grade VARCHAR(20) DEFAULT 'basic';
ALTER TABLE profiles ADD COLUMN grade_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN credits INTEGER DEFAULT 50; -- 가입 보너스
ALTER TABLE profiles ADD COLUMN grade_updated_at TIMESTAMPTZ DEFAULT now();
```

### 6.2 크레딧 거래 내역

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount INTEGER NOT NULL,  -- +면 획득, -면 사용
  balance_after INTEGER NOT NULL,  -- 거래 후 잔액
  type VARCHAR(50) NOT NULL,  -- earn_signup, earn_review, use_chat, purchase 등
  description TEXT,
  reference_id UUID,  -- 관련 테이블 ID (후기, 보증서 등)
  reference_type VARCHAR(50),  -- review_submission, warranty 등
  expires_at TIMESTAMPTZ,  -- 크레딧 만료일
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
```

### 6.3 후기 인증 신청

```sql
CREATE TABLE review_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  review_type VARCHAR(20) NOT NULL,  -- momcafe, instagram, blog
  review_url TEXT NOT NULL,
  screenshot_urls TEXT[],
  product_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
  rejection_reason TEXT,
  admin_note TEXT,
  credits_awarded INTEGER,
  points_awarded INTEGER,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_submissions_user ON review_submissions(user_id);
CREATE INDEX idx_review_submissions_status ON review_submissions(status);
```

### 6.4 구매 인증

```sql
CREATE TABLE purchase_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100),  -- sleepingbag, swaddle, noise_machine 등
  purchase_date DATE,
  purchase_place VARCHAR(255),  -- 구매처
  proof_urls TEXT[],  -- 구매 인증 사진
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
  rejection_reason TEXT,
  admin_note TEXT,
  credits_awarded INTEGER,
  points_awarded INTEGER,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_purchase_verifications_user ON purchase_verifications(user_id);
CREATE INDEX idx_purchase_verifications_status ON purchase_verifications(status);
```

### 6.5 등급 변경 이력

```sql
CREATE TABLE grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  previous_grade VARCHAR(20),
  new_grade VARCHAR(20) NOT NULL,
  reason VARCHAR(100),  -- upgrade, downgrade, manual
  points_at_change INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_grade_history_user ON grade_history(user_id);
```

### 6.6 출석 체크

```sql
CREATE TABLE daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  check_in_date DATE NOT NULL,
  streak_count INTEGER DEFAULT 1,  -- 연속 출석 일수
  credits_earned INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, check_in_date)
);

CREATE INDEX idx_daily_check_ins_user_date ON daily_check_ins(user_id, check_in_date);
```

---

## 7. 🚀 구현 우선순위

### Phase 1 (MVP) - 2주

| 기능 | 설명 | 난이도 |
|------|------|--------|
| DB 스키마 적용 | 테이블 생성, 마이그레이션 | ⭐⭐ |
| 등급 표시 | 마이페이지 등급 표시 | ⭐ |
| 크레딧 표시 | 마이페이지 크레딧 잔액 표시 | ⭐ |
| 후기 인증 신청 | 고객용 신청 화면 | ⭐⭐⭐ |
| 관리자 후기 승인 | 관리자용 승인/거절 화면 | ⭐⭐ |

### Phase 2 (확장) - 2주

| 기능 | 설명 | 난이도 |
|------|------|--------|
| 구매 인증 | 기타 제품 구매 인증 | ⭐⭐ |
| 크레딧 사용 | AI 상담 크레딧 차감 | ⭐⭐ |
| 등급 자동 승급 | 포인트 기반 자동 계산 | ⭐⭐ |
| 카카오 알림 | 승인/등급변경 알림 | ⭐⭐⭐ |

### Phase 3 (고도화) - 추후

| 기능 | 설명 | 난이도 |
|------|------|--------|
| 크레딧 결제 | 인앱 결제 연동 | ⭐⭐⭐⭐ |
| 출석 체크 | 일일 출석 보상 | ⭐⭐ |
| 마일스톤 보상 | 자동 보상 지급 | ⭐⭐⭐ |
| 크레딧 만료 관리 | 만료 알림, 자동 소멸 | ⭐⭐⭐ |

---

## 8. 참고 사항

### 8.1 법적 고려사항

- 크레딧 결제 시 전자상거래법 준수
- 환불 정책 명시
- 개인정보 처리방침 업데이트
- 이용약관 업데이트

### 8.2 운영 고려사항

- 후기 인증 담당자 지정
- 검토 SLA 설정 (1~2 영업일)
- 부정 사용 모니터링
- 고객 문의 대응 매뉴얼

### 8.3 마케팅 연계

- 등급별 타겟 마케팅
- 크레딧 프로모션 기획
- 후기 마케팅 활용 (동의 하에)

---

> 📌 이 기획서는 초안입니다. 실제 구현 전 내부 검토 및 수정이 필요합니다.


