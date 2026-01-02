-- =====================================================
-- 재고 변동 이력 테이블
-- 모든 재고 변동을 추적하여 감사 및 분석용
-- =====================================================

-- =====================================================
-- 1. inventory_history (재고 변동 이력)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 제품 정보
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,

    -- 창고 정보 (NULL이면 전체 재고)
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,

    -- 변동 유형
    change_type VARCHAR(50) NOT NULL DEFAULT 'adjustment',
    -- adjustment: 수동 조정
    -- receipt: 입고
    -- shipment: 출고
    -- transfer_in: 이동 입고
    -- transfer_out: 이동 출고
    -- return: 반품 입고
    -- csv_import: CSV 일괄 수정
    -- sync: 외부 동기화

    -- 재고 변동
    stock_before INTEGER NOT NULL DEFAULT 0,
    stock_after INTEGER NOT NULL DEFAULT 0,
    stock_change INTEGER NOT NULL DEFAULT 0,

    -- 변동 사유
    change_reason TEXT,

    -- 참조 정보 (어떤 문서에서 발생했는지)
    reference_type VARCHAR(50),  -- purchase_order, stock_receipt, stock_transfer, return, b2b_shipment, etc
    reference_id UUID,

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_inventory_history_sku ON inventory_history(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_history_warehouse ON inventory_history(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_change_type ON inventory_history(change_type);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON inventory_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_history_product ON inventory_history(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_reference ON inventory_history(reference_type, reference_id);

COMMENT ON TABLE inventory_history IS '재고 변동 이력 테이블';

-- =====================================================
-- 2. RLS 정책
-- =====================================================
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON inventory_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON inventory_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- 3. 재고 변동 기록 함수 (범용)
-- =====================================================
CREATE OR REPLACE FUNCTION record_inventory_change(
    p_sku VARCHAR,
    p_warehouse_id UUID,
    p_change_type VARCHAR,
    p_stock_before INTEGER,
    p_stock_after INTEGER,
    p_change_reason TEXT DEFAULT NULL,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_product_id UUID;
    v_history_id UUID;
BEGIN
    -- 제품 ID 조회
    SELECT id INTO v_product_id FROM products WHERE sku = p_sku;

    -- 이력 기록
    INSERT INTO inventory_history (
        product_id,
        sku,
        warehouse_id,
        change_type,
        stock_before,
        stock_after,
        stock_change,
        change_reason,
        reference_type,
        reference_id
    ) VALUES (
        v_product_id,
        p_sku,
        p_warehouse_id,
        p_change_type,
        p_stock_before,
        p_stock_after,
        p_stock_after - p_stock_before,
        p_change_reason,
        p_reference_type,
        p_reference_id
    ) RETURNING id INTO v_history_id;

    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. 재고 이력 뷰 (조회용)
-- =====================================================
CREATE OR REPLACE VIEW inventory_history_view AS
SELECT
    ih.id,
    ih.sku,
    ih.change_type,
    ih.stock_before,
    ih.stock_after,
    ih.stock_change,
    ih.change_reason,
    ih.reference_type,
    ih.reference_id,
    ih.created_at,
    p.product_name,
    p.color_kr,
    p.sku_6_size,
    w.warehouse_name,
    w.warehouse_code
FROM inventory_history ih
LEFT JOIN products p ON p.id = ih.product_id
LEFT JOIN warehouses w ON w.id = ih.warehouse_id
ORDER BY ih.created_at DESC;

COMMENT ON VIEW inventory_history_view IS '재고 이력 조회 뷰 (제품/창고 정보 포함)';
