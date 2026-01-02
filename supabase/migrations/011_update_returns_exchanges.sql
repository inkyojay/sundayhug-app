-- =====================================================
-- 교환/반품/AS 테이블 확장
-- 생성일: 2026-01-02
-- 용도: 교환/반품/AS 프로세스 개선
-- =====================================================

-- 기존 returns_exchanges 테이블에 컬럼 추가
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS pickup_date DATE;
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS pickup_carrier VARCHAR(50);
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS pickup_invoice VARCHAR(50);
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS inspection_date DATE;
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS inspection_result VARCHAR(50);
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS inspection_notes TEXT;

-- 교환 발송 정보
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS exchange_carrier VARCHAR(50);
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS exchange_invoice VARCHAR(50);
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS exchange_shipped_date DATE;

-- 환불 정보 (반품)
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50);
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS refund_date DATE;

-- AS 정보
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS repair_details TEXT;
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS repair_cost DECIMAL(10,2);
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS is_warranty_repair BOOLEAN DEFAULT true;

-- 완료일
ALTER TABLE returns_exchanges ADD COLUMN IF NOT EXISTS completed_date DATE;

-- =====================================================
-- 교환 대상 제품 테이블 (교환 시 어떤 제품으로 교환되는지)
-- =====================================================
CREATE TABLE IF NOT EXISTS return_exchange_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES returns_exchanges(id) ON DELETE CASCADE,

    -- 제품 정보
    product_id UUID REFERENCES products(id),
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255),
    option_name VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_return_exchange_products_return_id
ON return_exchange_products(return_id);

CREATE INDEX IF NOT EXISTS idx_return_exchange_products_product_id
ON return_exchange_products(product_id);

-- 코멘트
COMMENT ON TABLE return_exchange_products IS '교환 대상 제품 (교환 시 발송할 새 제품)';
COMMENT ON COLUMN return_exchange_products.return_id IS '교환/반품 ID';
COMMENT ON COLUMN return_exchange_products.product_id IS '제품 ID';
COMMENT ON COLUMN return_exchange_products.sku IS 'SKU 코드';
COMMENT ON COLUMN return_exchange_products.product_name IS '제품명';
COMMENT ON COLUMN return_exchange_products.option_name IS '옵션명';
COMMENT ON COLUMN return_exchange_products.quantity IS '수량';
COMMENT ON COLUMN return_exchange_products.unit_price IS '단가';

-- =====================================================
-- 상태 변경 이력 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS return_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES returns_exchanges(id) ON DELETE CASCADE,

    -- 상태 변경
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_return_status_history_return_id
ON return_status_history(return_id);

-- 코멘트
COMMENT ON TABLE return_status_history IS '교환/반품/AS 상태 변경 이력';
