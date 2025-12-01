-- =====================================================
-- 썬데이허그 내부 관리 시스템 - 초기 스키마
-- 생성일: 2025-11-12
-- 용도: PlayAuto 재고 관리 시스템
-- =====================================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================
-- 1. products (제품 마스터 테이블)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_is_active ON products(is_active);

-- 코멘트 추가
COMMENT ON TABLE products IS '제품 마스터 테이블 - PlayAuto SKU 정보';
COMMENT ON COLUMN products.sku IS 'PlayAuto SKU 코드 (고유값)';
COMMENT ON COLUMN products.product_name IS '제품명 (선택사항)';
COMMENT ON COLUMN products.category IS '제품 카테고리 (향후 확장용)';

-- =====================================================
-- 2. inventory (재고 현황 테이블)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    previous_stock INTEGER,
    stock_change INTEGER,
    alert_threshold INTEGER DEFAULT 10,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_synced_at ON inventory(synced_at DESC);
CREATE INDEX idx_inventory_low_stock ON inventory(current_stock) WHERE current_stock < alert_threshold;

-- 코멘트 추가
COMMENT ON TABLE inventory IS '실시간 재고 현황 테이블';
COMMENT ON COLUMN inventory.current_stock IS '현재 재고 수량';
COMMENT ON COLUMN inventory.previous_stock IS '이전 동기화 시 재고 수량';
COMMENT ON COLUMN inventory.stock_change IS '재고 변동량 (current - previous)';
COMMENT ON COLUMN inventory.alert_threshold IS '재고 알림 기준 (이하일 때 알림)';

-- =====================================================
-- 3. sync_logs (동기화 로그 테이블)
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('auto', 'manual')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'partial')),
    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER,
    triggered_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_sync_type ON sync_logs(sync_type);

-- 코멘트 추가
COMMENT ON TABLE sync_logs IS 'PlayAuto 동기화 로그 (성공/실패 추적)';
COMMENT ON COLUMN sync_logs.sync_type IS '동기화 유형: auto(자동) / manual(수동)';
COMMENT ON COLUMN sync_logs.status IS '동기화 상태: success / error / partial';
COMMENT ON COLUMN sync_logs.duration_ms IS '동기화 소요 시간 (밀리초)';

-- =====================================================
-- 4. inventory_history (재고 변동 이력 - 향후 분석용)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    stock_change INTEGER NOT NULL,
    change_reason VARCHAR(50),
    sync_log_id UUID REFERENCES sync_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_inventory_history_product_id ON inventory_history(product_id);
CREATE INDEX idx_inventory_history_created_at ON inventory_history(created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE inventory_history IS '재고 변동 이력 (시계열 분석용)';

-- =====================================================
-- 5. 트리거 함수: updated_at 자동 갱신
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- products 테이블에 트리거 적용
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. 뷰: 현재 재고 상태 요약
-- =====================================================
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
    p.id as product_id,
    p.sku,
    p.product_name,
    i.current_stock,
    i.alert_threshold,
    CASE 
        WHEN i.current_stock = 0 THEN '품절'
        WHEN i.current_stock <= i.alert_threshold THEN '재고부족'
        ELSE '정상'
    END as stock_status,
    i.stock_change,
    i.synced_at,
    i.created_at
FROM products p
LEFT JOIN LATERAL (
    SELECT * FROM inventory 
    WHERE product_id = p.id 
    ORDER BY synced_at DESC 
    LIMIT 1
) i ON true
WHERE p.is_active = true
ORDER BY i.synced_at DESC;

COMMENT ON VIEW inventory_summary IS '최신 재고 상태 요약 뷰';

-- =====================================================
-- 7. Row Level Security (RLS) 설정
-- =====================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모든 데이터 조회 가능
CREATE POLICY "Enable read access for authenticated users" ON products
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for authenticated users" ON inventory
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for authenticated users" ON sync_logs
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for authenticated users" ON inventory_history
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Service Role은 모든 작업 가능 (Edge Function용)
CREATE POLICY "Enable all for service role" ON products
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON inventory
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON sync_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON inventory_history
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 8. 샘플 데이터 (테스트용)
-- =====================================================
-- 실제 PlayAuto SKU로 교체 필요
INSERT INTO products (sku, product_name, category) VALUES
    ('SAMPLE-SKU-001', '샘플 제품 1', '테스트'),
    ('SAMPLE-SKU-002', '샘플 제품 2', '테스트')
ON CONFLICT (sku) DO NOTHING;

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ 데이터베이스 초기화 완료!';
    RAISE NOTICE '📊 생성된 테이블: products, inventory, sync_logs, inventory_history';
    RAISE NOTICE '👁️ 생성된 뷰: inventory_summary';
    RAISE NOTICE '🔒 RLS 정책 활성화 완료';
END $$;


