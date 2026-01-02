-- =====================================================
-- 쿠팡 옵션 테이블 확장 및 로켓그로스 창고 추가
-- =====================================================

-- 1. coupang_product_options에 fulfillment_type 컬럼 추가
ALTER TABLE coupang_product_options
ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(20);

-- 기존 데이터 업데이트 (rocketGrowthItem으로 저장된 것은 ROCKET_GROWTH)
UPDATE coupang_product_options
SET fulfillment_type = 'ROCKET_GROWTH'
WHERE fulfillment_type IS NULL;

-- 2. 로켓그로스 전용 창고 추가
INSERT INTO warehouses (
  warehouse_code,
  warehouse_name,
  warehouse_type,
  location,
  is_active,
  is_default
)
VALUES (
  'WH-COUPANG-RG',
  '쿠팡 로켓그로스',
  '3pl',
  '쿠팡물류센터',
  true,
  false
)
ON CONFLICT (warehouse_code) DO NOTHING;

-- 3. fulfillment_type 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_coupang_product_options_fulfillment_type
ON coupang_product_options(fulfillment_type);

-- 4. sku_id 인덱스 추가 (SKU 매핑 조회 성능)
CREATE INDEX IF NOT EXISTS idx_coupang_product_options_sku_id
ON coupang_product_options(sku_id);

COMMENT ON COLUMN coupang_product_options.fulfillment_type IS '판매방식: ROCKET_GROWTH(로켓그로스), MARKETPLACE(판매자배송)';
