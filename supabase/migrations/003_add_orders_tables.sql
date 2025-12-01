-- =====================================================
-- 썬데이허그 - 주문 관리 시스템 스키마
-- 생성일: 2025-11-12
-- 용도: PlayAuto 주문 데이터 저장 및 캐싱
-- =====================================================

-- =====================================================
-- 1. orders (주문 마스터 테이블)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- PlayAuto 기본 정보
    sol_no INTEGER NOT NULL,
    uniq VARCHAR(50) NOT NULL UNIQUE,
    ori_uniq VARCHAR(50),
    bundle_no VARCHAR(50),
    
    -- 주문 상태
    ord_status VARCHAR(50) NOT NULL,
    dupl_doubt_yn BOOLEAN DEFAULT false,
    
    -- 택배사 정보
    carr_no INTEGER,
    carr_ser_no INTEGER,
    carr_name VARCHAR(100),
    carr_ser_name VARCHAR(100),
    
    -- 송장 정보
    invoice_no VARCHAR(50),
    
    -- 출고 예정일
    ship_plan_date DATE,
    
    -- 쇼핑몰 정보
    shop_cd VARCHAR(20),
    shop_name VARCHAR(100),
    shop_id VARCHAR(100),
    seller_nick VARCHAR(100),
    shop_ord_no VARCHAR(100),
    shop_ord_no_real VARCHAR(100),
    shop_sale_no VARCHAR(100),
    shop_sale_name VARCHAR(255),
    shop_sku_cd VARCHAR(100),
    shop_opt_name VARCHAR(255),
    
    -- 주문 수량
    sale_cnt INTEGER DEFAULT 0,
    
    -- 추가 옵션명
    shop_add_opt_name VARCHAR(255),
    
    -- 배송 방법
    ship_method VARCHAR(50),
    
    -- 스마트스토어 배송 타입
    delivery_attribute_type VARCHAR(50),
    
    -- 시간 정보
    out_time TIMESTAMPTZ,
    wdate TIMESTAMPTZ,
    ord_time TIMESTAMPTZ,
    pay_time TIMESTAMPTZ,
    ord_confirm_time TIMESTAMPTZ,
    claim_time TIMESTAMPTZ,
    claim_com_time TIMESTAMPTZ,
    ship_hope_time DATE,
    api_read_time TIMESTAMPTZ,
    
    -- API 호출 상태
    api_read_status VARCHAR(20),
    
    -- 금액 정보
    pay_amt DECIMAL(12,2) DEFAULT 0,
    discount_amt DECIMAL(12,2) DEFAULT 0,
    shop_discount DECIMAL(12,2) DEFAULT 0,
    seller_discount DECIMAL(12,2) DEFAULT 0,
    coupon_discount DECIMAL(12,2) DEFAULT 0,
    point_discount DECIMAL(12,2) DEFAULT 0,
    
    -- 주문 정렬
    orderby VARCHAR(50),
    
    -- 주문자 정보
    order_name VARCHAR(50),
    order_id VARCHAR(50),
    order_tel VARCHAR(30),
    order_htel VARCHAR(30),
    order_email VARCHAR(100),
    
    -- 배송 메시지
    ship_msg TEXT,
    out_order_time TIMESTAMPTZ,
    
    -- 수령자 정보
    to_ctry_cd VARCHAR(10),
    to_name VARCHAR(50),
    to_tel VARCHAR(30),
    to_htel VARCHAR(30),
    to_addr1 VARCHAR(255),
    to_addr2 VARCHAR(255),
    to_zipcd VARCHAR(20),
    
    -- 배송비
    ship_cost DECIMAL(8,2) DEFAULT 0,
    
    -- 판매 정보
    c_sale_cd VARCHAR(100),
    ord_curr_cd VARCHAR(10),
    gprivate_no VARCHAR(100),
    barcode VARCHAR(100),
    
    -- 배송처 정보
    depot_no INTEGER,
    depot_name VARCHAR(100),
    
    -- 배송 관련
    sales DECIMAL(12,2) DEFAULT 0,
    sales_tax DECIMAL(11,2) DEFAULT 0,
    shop_cost_price DECIMAL(12,2) DEFAULT 0,
    shop_supply_price DECIMAL(12,2) DEFAULT 0,
    ship_delay_yn INTEGER DEFAULT 0,
    ship_avail_yn INTEGER DEFAULT 0,
    ship_unable_reason VARCHAR(200),
    ord_status_msg VARCHAR(255),
    exchange_yn INTEGER DEFAULT 0,
    memo_yn INTEGER DEFAULT 0,
    bundle_avail_yn INTEGER DEFAULT 0,
    multi_bundle_yn INTEGER DEFAULT 0,
    
    -- 기타
    memo_yn_bool BOOLEAN DEFAULT false,
    map_yn BOOLEAN DEFAULT false,
    supp_vendor VARCHAR(100),
    multi_type VARCHAR(50),
    multi_search_word VARCHAR(255),
    masking_yn BOOLEAN DEFAULT false,
    fulfillment_yn BOOLEAN DEFAULT false,
    non_shipping_yn BOOLEAN DEFAULT false,
    
    -- 증정품 정보
    gift_prod_name VARCHAR(255),
    delay_status BOOLEAN DEFAULT false,
    unstore_status BOOLEAN DEFAULT false,
    delay_ship BOOLEAN DEFAULT false,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_orders_uniq ON orders(uniq);
CREATE INDEX idx_orders_bundle_no ON orders(bundle_no);
CREATE INDEX idx_orders_ord_status ON orders(ord_status);
CREATE INDEX idx_orders_shop_cd ON orders(shop_cd);
CREATE INDEX idx_orders_shop_ord_no ON orders(shop_ord_no);
CREATE INDEX idx_orders_invoice_no ON orders(invoice_no);
CREATE INDEX idx_orders_ord_time ON orders(ord_time DESC);
CREATE INDEX idx_orders_synced_at ON orders(synced_at DESC);
CREATE INDEX idx_orders_ship_plan_date ON orders(ship_plan_date);

-- 코멘트 추가
COMMENT ON TABLE orders IS 'PlayAuto 주문 마스터 테이블';
COMMENT ON COLUMN orders.uniq IS '주문 고유번호 (PlayAuto)';
COMMENT ON COLUMN orders.bundle_no IS '묶음 배송 번호';
COMMENT ON COLUMN orders.ord_status IS '주문 상태 (결제완료, 상품준비중, 배송중 등)';
COMMENT ON COLUMN orders.shop_cd IS '쇼핑몰 코드';
COMMENT ON COLUMN orders.synced_at IS '마지막 동기화 시간';

-- =====================================================
-- 2. order_items (주문 상품 상세 테이블)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    
    -- SKU 정보
    sku_cd VARCHAR(100),
    product_name VARCHAR(255),
    shop_opt_name VARCHAR(255),
    shop_add_opt_name VARCHAR(255),
    
    -- 수량 및 금액
    sale_cnt INTEGER DEFAULT 0,
    pay_amt DECIMAL(12,2) DEFAULT 0,
    
    -- 옵션 정보
    set_no INTEGER,
    pack_unit INTEGER,
    out_cnt INTEGER,
    set_name VARCHAR(255),
    pay_method VARCHAR(50),
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_sku_cd ON order_items(sku_cd);

-- 코멘트 추가
COMMENT ON TABLE order_items IS '주문 상품 상세 정보 (향후 확장용)';

-- =====================================================
-- 3. order_sync_logs (주문 동기화 로그)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('auto', 'manual', 'cache')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'partial', 'cached')),
    orders_synced INTEGER DEFAULT 0,
    orders_failed INTEGER DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    shop_cd VARCHAR(20),
    error_message TEXT,
    duration_ms INTEGER,
    source VARCHAR(20) CHECK (source IN ('api', 'cache')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_order_sync_logs_created_at ON order_sync_logs(created_at DESC);
CREATE INDEX idx_order_sync_logs_status ON order_sync_logs(status);

-- 코멘트 추가
COMMENT ON TABLE order_sync_logs IS '주문 동기화 로그 테이블';
COMMENT ON COLUMN order_sync_logs.source IS '데이터 출처: api(PlayAuto API) / cache(Supabase 캐시)';

-- =====================================================
-- 4. 주문 요약 뷰 (대시보드용)
-- =====================================================
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.uniq,
    o.bundle_no,
    o.ord_status,
    o.shop_name,
    o.shop_ord_no,
    o.invoice_no,
    o.ship_plan_date,
    o.sale_cnt,
    o.pay_amt,
    o.to_name,
    o.to_tel,
    o.to_addr1,
    o.to_addr2,
    o.ord_time,
    o.ship_method,
    o.carr_name,
    o.synced_at,
    o.created_at
FROM orders o
ORDER BY o.ord_time DESC;

COMMENT ON VIEW order_summary IS '주문 요약 뷰 (대시보드용)';

-- =====================================================
-- 5. 주문 상태별 통계 뷰
-- =====================================================
CREATE OR REPLACE VIEW order_status_stats AS
SELECT 
    ord_status,
    COUNT(*) as order_count,
    SUM(sale_cnt) as total_items,
    SUM(pay_amt) as total_amount,
    COUNT(DISTINCT shop_cd) as shop_count,
    MAX(ord_time) as latest_order_time
FROM orders
GROUP BY ord_status;

COMMENT ON VIEW order_status_stats IS '주문 상태별 통계 (대시보드용)';

-- =====================================================
-- 6. 최근 주문 함수 (캐시 우선 조회)
-- =====================================================
CREATE OR REPLACE FUNCTION get_recent_orders(
    days_ago INTEGER DEFAULT 7,
    shop_code VARCHAR DEFAULT NULL,
    order_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    uniq VARCHAR,
    bundle_no VARCHAR,
    ord_status VARCHAR,
    shop_name VARCHAR,
    shop_ord_no VARCHAR,
    pay_amt DECIMAL,
    sale_cnt INTEGER,
    to_name VARCHAR,
    ord_time TIMESTAMPTZ,
    synced_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.uniq,
        o.bundle_no,
        o.ord_status,
        o.shop_name,
        o.shop_ord_no,
        o.pay_amt,
        o.sale_cnt,
        o.to_name,
        o.ord_time,
        o.synced_at
    FROM orders o
    WHERE o.ord_time >= NOW() - (days_ago || ' days')::INTERVAL
        AND (shop_code IS NULL OR o.shop_cd = shop_code)
        AND (order_status IS NULL OR o.ord_status = order_status)
    ORDER BY o.ord_time DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_recent_orders IS '최근 N일 주문 조회 (캐시 우선)';



