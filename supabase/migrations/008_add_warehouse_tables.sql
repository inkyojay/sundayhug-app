-- =====================================================
-- 창고 관리 및 창고별 재고 테이블
-- B2B 출고 시스템과 연동
-- =====================================================

-- =====================================================
-- 1. warehouses (창고 마스터)
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 기본 정보
    warehouse_code VARCHAR(50) UNIQUE NOT NULL,    -- WH-001
    warehouse_name VARCHAR(255) NOT NULL,
    warehouse_type VARCHAR(50) DEFAULT 'internal', -- internal(자체) / 3pl(물류대행)

    -- 위치 정보
    location VARCHAR(255),                          -- 지역명 (서울, 경기 등)
    address TEXT,                                   -- 상세 주소

    -- 담당자 정보
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),

    -- 설정
    is_default BOOLEAN DEFAULT false,              -- 기본 출고 창고
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_warehouses_is_default ON warehouses(is_default) WHERE is_default = true;

COMMENT ON TABLE warehouses IS '창고 마스터 테이블';

-- =====================================================
-- 2. inventory_locations (창고별 재고)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,

    -- 재고 수량
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,           -- 예약된 수량 (출고 대기)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 동일 창고-SKU 조합은 하나만
    UNIQUE(warehouse_id, sku)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_inventory_locations_warehouse ON inventory_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_sku ON inventory_locations(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_quantity ON inventory_locations(quantity);

COMMENT ON TABLE inventory_locations IS '창고별 SKU 재고 현황';

-- =====================================================
-- 3. b2b_shipments에 warehouse_id 컬럼 추가
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'b2b_shipments' AND column_name = 'warehouse_id'
    ) THEN
        ALTER TABLE b2b_shipments
        ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    END IF;
END $$;

-- =====================================================
-- 4. 재고 변동 함수들
-- =====================================================

-- 창고별 재고 차감 함수
CREATE OR REPLACE FUNCTION decrease_inventory_location(
    p_warehouse_id UUID,
    p_sku VARCHAR,
    p_quantity INTEGER,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_qty INTEGER;
    v_product_id UUID;
BEGIN
    -- 현재 재고 조회 (행 잠금)
    SELECT quantity INTO v_current_qty
    FROM inventory_locations
    WHERE warehouse_id = p_warehouse_id AND sku = p_sku
    FOR UPDATE;

    IF v_current_qty IS NULL THEN
        RAISE EXCEPTION '해당 창고에 SKU(%)가 존재하지 않습니다.', p_sku;
    END IF;

    IF v_current_qty < p_quantity THEN
        RAISE WARNING '재고 부족: 현재 %개, 요청 %개', v_current_qty, p_quantity;
        -- 재고 부족해도 차감은 허용 (음수 가능)
    END IF;

    -- 창고별 재고 차감
    UPDATE inventory_locations
    SET
        quantity = quantity - p_quantity,
        updated_at = NOW()
    WHERE warehouse_id = p_warehouse_id AND sku = p_sku;

    -- 제품 ID 조회
    SELECT id INTO v_product_id FROM products WHERE sku = p_sku;

    -- 이력 기록
    IF v_product_id IS NOT NULL THEN
        INSERT INTO inventory_history (
            product_id, sku,
            stock_before, stock_after, stock_change,
            change_reason
        ) VALUES (
            v_product_id, p_sku,
            v_current_qty, v_current_qty - p_quantity, -p_quantity,
            COALESCE(p_reason, 'B2B 출고')
        );
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 창고별 재고 증가 함수
CREATE OR REPLACE FUNCTION increase_inventory_location(
    p_warehouse_id UUID,
    p_sku VARCHAR,
    p_quantity INTEGER,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_qty INTEGER;
    v_product_id UUID;
BEGIN
    -- 현재 재고 조회 (없으면 생성)
    SELECT quantity INTO v_current_qty
    FROM inventory_locations
    WHERE warehouse_id = p_warehouse_id AND sku = p_sku
    FOR UPDATE;

    IF v_current_qty IS NULL THEN
        -- 새로 생성
        INSERT INTO inventory_locations (warehouse_id, sku, quantity)
        VALUES (p_warehouse_id, p_sku, p_quantity);
        v_current_qty := 0;
    ELSE
        -- 기존 재고 증가
        UPDATE inventory_locations
        SET
            quantity = quantity + p_quantity,
            updated_at = NOW()
        WHERE warehouse_id = p_warehouse_id AND sku = p_sku;
    END IF;

    -- 제품 ID 조회
    SELECT id INTO v_product_id FROM products WHERE sku = p_sku;

    -- 이력 기록
    IF v_product_id IS NOT NULL THEN
        INSERT INTO inventory_history (
            product_id, sku,
            stock_before, stock_after, stock_change,
            change_reason
        ) VALUES (
            v_product_id, p_sku,
            v_current_qty, v_current_qty + p_quantity, p_quantity,
            COALESCE(p_reason, 'B2B 출고 취소')
        );
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 전체 재고(inventory) 차감 함수
CREATE OR REPLACE FUNCTION decrease_inventory(
    p_sku VARCHAR,
    p_quantity INTEGER,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_qty INTEGER;
    v_product_id UUID;
BEGIN
    -- 제품 ID 조회
    SELECT id INTO v_product_id FROM products WHERE sku = p_sku;

    IF v_product_id IS NULL THEN
        RAISE EXCEPTION 'SKU(%)가 존재하지 않습니다.', p_sku;
    END IF;

    -- 현재 재고 조회
    SELECT current_stock INTO v_current_qty
    FROM inventory
    WHERE sku = p_sku
    ORDER BY synced_at DESC
    LIMIT 1;

    IF v_current_qty IS NULL THEN
        v_current_qty := 0;
    END IF;

    -- 재고 업데이트
    UPDATE inventory
    SET
        previous_stock = current_stock,
        current_stock = current_stock - p_quantity,
        stock_change = -p_quantity,
        synced_at = NOW()
    WHERE sku = p_sku;

    -- 이력 기록
    INSERT INTO inventory_history (
        product_id, sku,
        stock_before, stock_after, stock_change,
        change_reason
    ) VALUES (
        v_product_id, p_sku,
        v_current_qty, v_current_qty - p_quantity, -p_quantity,
        COALESCE(p_reason, 'B2B 출고 (전체재고)')
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. 창고별 재고 합계 뷰
-- =====================================================
CREATE OR REPLACE VIEW warehouse_inventory_summary AS
SELECT
    w.id as warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    w.warehouse_type,
    w.is_default,
    COUNT(DISTINCT il.sku) as sku_count,
    COALESCE(SUM(il.quantity), 0) as total_quantity,
    COALESCE(SUM(il.reserved_quantity), 0) as total_reserved
FROM warehouses w
LEFT JOIN inventory_locations il ON il.warehouse_id = w.id
WHERE w.is_active = true AND w.is_deleted = false
GROUP BY w.id, w.warehouse_code, w.warehouse_name, w.warehouse_type, w.is_default
ORDER BY w.is_default DESC, w.warehouse_name;

COMMENT ON VIEW warehouse_inventory_summary IS '창고별 재고 합계 요약';

-- =====================================================
-- 6. RLS 정책
-- =====================================================

-- warehouses
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON warehouses
    FOR ALL USING (auth.role() = 'authenticated');

-- inventory_locations
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON inventory_locations
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 7. 기본 창고 데이터 (초기 셋업)
-- =====================================================
INSERT INTO warehouses (warehouse_code, warehouse_name, warehouse_type, is_default)
VALUES ('WH-MAIN', '본사 창고', 'internal', true)
ON CONFLICT (warehouse_code) DO NOTHING;

-- =====================================================
-- 8. 기존 inventory 데이터를 inventory_locations로 마이그레이션
-- (기본 창고로 이전)
-- =====================================================
INSERT INTO inventory_locations (warehouse_id, sku, quantity)
SELECT
    (SELECT id FROM warehouses WHERE warehouse_code = 'WH-MAIN'),
    i.sku,
    i.current_stock
FROM inventory i
WHERE i.current_stock > 0
ON CONFLICT (warehouse_id, sku) DO UPDATE
SET quantity = EXCLUDED.quantity;
