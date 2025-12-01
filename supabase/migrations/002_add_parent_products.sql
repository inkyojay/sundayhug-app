-- =====================================================
-- 제품 분류 (Parent Products) 테이블 추가
-- 노션 연동을 위한 스키마 확장
-- =====================================================

-- 1. Parent Products 테이블 생성
CREATE TABLE IF NOT EXISTS parent_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description TEXT,
    notion_page_id VARCHAR(100) UNIQUE,  -- 노션 페이지 ID (중복 방지)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_parent_products_sku ON parent_products(parent_sku);
CREATE INDEX idx_parent_products_notion_id ON parent_products(notion_page_id);
CREATE INDEX idx_parent_products_category ON parent_products(category);

-- 코멘트 추가
COMMENT ON TABLE parent_products IS '제품 분류(Parent SKU) 마스터 테이블 - 노션에서 관리';
COMMENT ON COLUMN parent_products.parent_sku IS '상위 제품 SKU 코드';
COMMENT ON COLUMN parent_products.notion_page_id IS '노션 데이터베이스 페이지 ID';

-- 2. Products 테이블에 parent_sku 컬럼 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS parent_sku VARCHAR(100),
ADD COLUMN IF NOT EXISTS notion_page_id VARCHAR(100) UNIQUE;

-- 외래키 제약 조건 추가
ALTER TABLE products
ADD CONSTRAINT fk_parent_product 
FOREIGN KEY (parent_sku) 
REFERENCES parent_products(parent_sku)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_products_parent_sku ON products(parent_sku);
CREATE INDEX IF NOT EXISTS idx_products_notion_id ON products(notion_page_id);

-- 코멘트 추가
COMMENT ON COLUMN products.parent_sku IS '상위 제품 SKU (parent_products 참조)';
COMMENT ON COLUMN products.notion_page_id IS '노션 Solo SKU 페이지 ID';

-- 3. Updated_at 트리거 (parent_products)
CREATE OR REPLACE FUNCTION update_parent_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_products_timestamp
BEFORE UPDATE ON parent_products
FOR EACH ROW
EXECUTE FUNCTION update_parent_products_updated_at();

-- 4. 노션 동기화 로그 테이블
CREATE TABLE IF NOT EXISTS notion_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL,  -- 'parent_products', 'solo_products'
    status VARCHAR(20) NOT NULL,     -- 'success', 'error', 'partial'
    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notion_sync_logs_created ON notion_sync_logs(created_at DESC);

COMMENT ON TABLE notion_sync_logs IS '노션 → Supabase 동기화 로그';

-- 5. 제품별 재고 집계 뷰 (Parent SKU 기준)
CREATE OR REPLACE VIEW parent_inventory_summary AS
SELECT 
    pp.parent_sku,
    pp.product_name,
    pp.category,
    COUNT(DISTINCT p.id) as total_solo_skus,
    SUM(COALESCE(inv.current_stock, 0)) as total_stock,
    MIN(inv.synced_at) as oldest_sync,
    MAX(inv.synced_at) as latest_sync,
    pp.is_active
FROM parent_products pp
LEFT JOIN products p ON pp.parent_sku = p.parent_sku
LEFT JOIN LATERAL (
    SELECT current_stock, synced_at
    FROM inventory
    WHERE product_id = p.id
    ORDER BY synced_at DESC
    LIMIT 1
) inv ON true
GROUP BY pp.parent_sku, pp.product_name, pp.category, pp.is_active;

COMMENT ON VIEW parent_inventory_summary IS '제품 분류별 재고 집계 뷰';

-- 6. RLS 정책 (Row Level Security)
ALTER TABLE parent_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_sync_logs ENABLE ROW LEVEL SECURITY;

-- 읽기 권한 (인증된 사용자)
CREATE POLICY "Enable read access for authenticated users" ON parent_products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for notion sync logs" ON notion_sync_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- 쓰기 권한 (service_role만)
CREATE POLICY "Enable all access for service role" ON parent_products
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable insert for service role on sync logs" ON notion_sync_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 7. 샘플 데이터 (테스트용)
INSERT INTO parent_products (parent_sku, product_name, category, subcategory, description)
VALUES 
    ('PARENT-SLEEPINGBAG', '슬리핑백', '수면용품', '슬리핑백', '신생아 슬리핑백 전체 라인업'),
    ('PARENT-SWADDLE', '속싸개', '수면용품', '속싸개', '신생아 속싸개 제품군'),
    ('PARENT-BODYSUIT', '바디수트', '의류', '바디수트', '아기 바디수트 전체 라인업')
ON CONFLICT (parent_sku) DO NOTHING;

-- 8. 기존 products 테이블 샘플 데이터에 parent_sku 연결 (예시)
-- 실제 데이터는 노션 동기화로 채워질 예정
UPDATE products 
SET parent_sku = 'PARENT-SLEEPINGBAG'
WHERE sku LIKE '%SLEEPINGBAG%' OR product_name ILIKE '%슬리핑백%';

UPDATE products 
SET parent_sku = 'PARENT-SWADDLE'
WHERE sku LIKE '%SWADDLE%' OR product_name ILIKE '%속싸개%';

UPDATE products 
SET parent_sku = 'PARENT-BODYSUIT'
WHERE sku LIKE '%BODY%' OR product_name ILIKE '%바디수트%';


