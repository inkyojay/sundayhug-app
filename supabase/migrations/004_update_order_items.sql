-- =====================================================
-- order_items 테이블 필드 추가
-- 생성일: 2025-11-25
-- 용도: PlayAuto results_prod 데이터 완전 저장
-- =====================================================

-- order_items 테이블에 추가 필드들
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS stock_cd VARCHAR(100),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_cnt_real INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS depot_no INTEGER,
ADD COLUMN IF NOT EXISTS depot_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS prod_img TEXT,
ADD COLUMN IF NOT EXISTS set_cd VARCHAR(50),
ADD COLUMN IF NOT EXISTS add_opt_yn BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prod_no INTEGER,
ADD COLUMN IF NOT EXISTS model_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS attri TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_order_items_sku_cd ON order_items(sku_cd);
CREATE INDEX IF NOT EXISTS idx_order_items_barcode ON order_items(barcode);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 코멘트 추가
COMMENT ON COLUMN order_items.sku_cd IS '상품 SKU 코드';
COMMENT ON COLUMN order_items.stock_cd IS '재고 코드';
COMMENT ON COLUMN order_items.barcode IS '바코드';
COMMENT ON COLUMN order_items.stock_cnt_real IS '실재고 수량';
COMMENT ON COLUMN order_items.depot_no IS '배송처 번호';
COMMENT ON COLUMN order_items.depot_name IS '배송처 이름';



