-- =====================================================
-- 우선 출고 창고 및 재고 이동 테이블
-- =====================================================

-- =====================================================
-- 0. inventory_locations에 product_id 컬럼 추가
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory_locations' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE inventory_locations
        ADD COLUMN product_id UUID REFERENCES products(id);
    END IF;
END $$;

-- 기존 데이터에 product_id 업데이트
UPDATE inventory_locations il
SET product_id = p.id
FROM products p
WHERE il.sku = p.sku AND il.product_id IS NULL;

-- =====================================================
-- 1. products 테이블에 우선 출고 창고 컬럼 추가
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'priority_warehouse_id'
    ) THEN
        ALTER TABLE products
        ADD COLUMN priority_warehouse_id UUID REFERENCES warehouses(id);
    END IF;
END $$;

-- 기본 창고로 초기값 설정
UPDATE products
SET priority_warehouse_id = (SELECT id FROM warehouses WHERE is_default = true LIMIT 1)
WHERE priority_warehouse_id IS NULL;

-- =====================================================
-- 2. stock_transfers (창고 간 재고 이동 이력)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 이동 정보
    transfer_number VARCHAR(50) UNIQUE NOT NULL,  -- TRF-20251231-0001
    sku VARCHAR(100) NOT NULL,
    product_id UUID REFERENCES products(id),

    -- 출발/도착 창고
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- 수량
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    -- 상태
    status VARCHAR(20) DEFAULT 'completed',  -- pending, in_transit, completed, cancelled

    -- 메모
    notes TEXT,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),

    -- 출발/도착 창고가 같으면 안됨
    CONSTRAINT different_warehouses CHECK (from_warehouse_id != to_warehouse_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_stock_transfers_sku ON stock_transfers(sku);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_warehouse ON stock_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_warehouse ON stock_transfers(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_at ON stock_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);

COMMENT ON TABLE stock_transfers IS '창고 간 재고 이동 이력';

-- =====================================================
-- 3. RLS 정책
-- =====================================================
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON stock_transfers
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. 재고 이동 실행 함수
-- =====================================================
CREATE OR REPLACE FUNCTION execute_stock_transfer(
    p_sku VARCHAR,
    p_from_warehouse_id UUID,
    p_to_warehouse_id UUID,
    p_quantity INTEGER,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_transfer_id UUID;
    v_transfer_number VARCHAR(50);
    v_product_id UUID;
    v_from_qty INTEGER;
BEGIN
    -- 출발/도착 창고가 같은지 확인
    IF p_from_warehouse_id = p_to_warehouse_id THEN
        RAISE EXCEPTION '출발 창고와 도착 창고가 같을 수 없습니다.';
    END IF;

    -- 이동 수량 확인
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION '이동 수량은 1개 이상이어야 합니다.';
    END IF;

    -- 출발 창고 재고 확인
    SELECT quantity INTO v_from_qty
    FROM inventory_locations
    WHERE warehouse_id = p_from_warehouse_id AND sku = p_sku
    FOR UPDATE;

    IF v_from_qty IS NULL THEN
        RAISE EXCEPTION '출발 창고에 해당 SKU(%)가 존재하지 않습니다.', p_sku;
    END IF;

    IF v_from_qty < p_quantity THEN
        RAISE EXCEPTION '출발 창고 재고 부족: 현재 %개, 요청 %개', v_from_qty, p_quantity;
    END IF;

    -- 제품 ID 조회
    SELECT id INTO v_product_id FROM products WHERE sku = p_sku;

    -- 이동 번호 생성
    v_transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
        LPAD((SELECT COUNT(*) + 1 FROM stock_transfers WHERE transfer_number LIKE 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '%')::TEXT, 4, '0');

    -- 출발 창고 재고 차감
    UPDATE inventory_locations
    SET quantity = quantity - p_quantity, updated_at = NOW()
    WHERE warehouse_id = p_from_warehouse_id AND sku = p_sku;

    -- 도착 창고 재고 증가 (없으면 생성)
    INSERT INTO inventory_locations (warehouse_id, sku, product_id, quantity)
    VALUES (p_to_warehouse_id, p_sku, v_product_id, p_quantity)
    ON CONFLICT (warehouse_id, sku) DO UPDATE
    SET quantity = inventory_locations.quantity + p_quantity, updated_at = NOW();

    -- 이동 이력 기록
    INSERT INTO stock_transfers (
        transfer_number, sku, product_id,
        from_warehouse_id, to_warehouse_id,
        quantity, status, notes, completed_at
    ) VALUES (
        v_transfer_number, p_sku, v_product_id,
        p_from_warehouse_id, p_to_warehouse_id,
        p_quantity, 'completed', p_notes, NOW()
    ) RETURNING id INTO v_transfer_id;

    -- 재고 이력 기록 (출발 창고)
    INSERT INTO inventory_history (
        product_id, sku,
        stock_before, stock_after, stock_change,
        change_reason
    ) VALUES (
        v_product_id, p_sku,
        v_from_qty, v_from_qty - p_quantity, -p_quantity,
        '창고 이동 출고: ' || v_transfer_number
    );

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION execute_stock_transfer IS '창고 간 재고 이동을 원자적으로 실행';

-- =====================================================
-- 5. 창고별 재고 현황 뷰 (products 정보 포함)
-- =====================================================
CREATE OR REPLACE VIEW warehouse_inventory_detail AS
SELECT
    il.id,
    il.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    w.is_default as is_default_warehouse,
    il.sku,
    il.quantity,
    il.reserved_quantity,
    il.quantity - COALESCE(il.reserved_quantity, 0) as available_quantity,
    p.id as product_id,
    p.product_name,
    p.parent_sku,
    p.color_kr,
    p.sku_6_size,
    p.priority_warehouse_id,
    CASE WHEN p.priority_warehouse_id = il.warehouse_id THEN true ELSE false END as is_priority_warehouse,
    il.updated_at
FROM inventory_locations il
JOIN warehouses w ON w.id = il.warehouse_id
LEFT JOIN products p ON p.sku = il.sku
WHERE w.is_active = true AND w.is_deleted = false
ORDER BY il.sku, w.warehouse_name;

COMMENT ON VIEW warehouse_inventory_detail IS '창고별 SKU 재고 상세 (제품 정보 포함)';
