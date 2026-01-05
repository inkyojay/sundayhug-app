-- =====================================================
-- 주문 재고 차감 플래그 추가
-- orders 테이블에 inventory_deducted 컬럼 추가
-- =====================================================

-- 1. orders 테이블에 inventory_deducted 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'inventory_deducted'
    ) THEN
        ALTER TABLE orders
        ADD COLUMN inventory_deducted BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. 인덱스 추가 (재고 미차감 주문 빠른 조회용)
CREATE INDEX IF NOT EXISTS idx_orders_inventory_deducted
    ON orders(inventory_deducted)
    WHERE inventory_deducted = false;

-- 3. 코멘트 추가
COMMENT ON COLUMN orders.inventory_deducted IS '재고 차감 완료 여부 (true: 차감됨, false: 미차감)';

-- =====================================================
-- 재고 차감 관련 뷰
-- =====================================================

-- 재고 미차감 주문 뷰 (출고 대기 주문)
CREATE OR REPLACE VIEW orders_pending_deduction AS
SELECT
    o.id,
    o.uniq,
    o.shop_ord_no,
    o.ord_status,
    o.shop_cd,
    o.shop_name,
    o.shop_sale_name,
    o.shop_sku_cd,
    o.sale_cnt,
    o.to_name,
    o.ord_time,
    o.inventory_deducted,
    p.product_name,
    p.priority_warehouse_id,
    w.warehouse_name as priority_warehouse_name
FROM orders o
LEFT JOIN products p ON p.sku = o.shop_sku_cd
LEFT JOIN warehouses w ON w.id = p.priority_warehouse_id
WHERE o.inventory_deducted = false
  AND o.ord_status IN ('결제완료', '상품준비중')
ORDER BY o.ord_time ASC;

COMMENT ON VIEW orders_pending_deduction IS '재고 미차감 주문 목록 (출고 대기)';
