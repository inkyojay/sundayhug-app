-- =====================================================
-- 주문 분석 시스템을 위한 DB 마이그레이션
-- 
-- 1. customers 테이블 생성 (고객 통합 관리)
-- 2. orders 테이블에 customer_id 컬럼 추가
-- =====================================================

-- 1. customers 테이블 생성
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 고객 식별 정보 (이름 + 전화번호 조합으로 유니크)
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  normalized_phone TEXT, -- 정규화된 전화번호 (하이픈/공백 제거)
  
  -- 집계 데이터 (캐싱용)
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  channels TEXT[] DEFAULT '{}', -- 구매 채널 목록 ['cafe24', 'naver']
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 유니크 제약조건 (이름 + 정규화된 전화번호)
  UNIQUE(name, normalized_phone)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_customers_normalized_phone ON customers(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_channels ON customers USING GIN(channels);

-- 2. orders 테이블에 customer_id 컬럼 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- orders 테이블에 customer_id 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- 3. 기존 주문 데이터로 customers 테이블 초기화 (선택적)
-- 주의: 대량 데이터의 경우 별도 스크립트로 실행 권장
/*
INSERT INTO customers (name, phone, normalized_phone, first_order_date, last_order_date, total_orders)
SELECT 
  to_name,
  COALESCE(to_tel, to_htel),
  REGEXP_REPLACE(COALESCE(to_tel, to_htel), '[^0-9]', '', 'g'),
  MIN(ord_time),
  MAX(ord_time),
  COUNT(*)
FROM orders 
WHERE to_name IS NOT NULL 
  AND (to_tel IS NOT NULL OR to_htel IS NOT NULL)
  AND shop_cd != 'playauto'
GROUP BY to_name, COALESCE(to_tel, to_htel)
ON CONFLICT (name, normalized_phone) DO NOTHING;
*/

-- RLS 정책 (필요시)
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

