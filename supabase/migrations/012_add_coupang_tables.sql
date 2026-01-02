-- =====================================================
-- 쿠팡 로켓그로스 연동 테이블
-- 생성일: 2026-01-02
-- 용도: 쿠팡 로켓그로스 API 연동
-- =====================================================

-- =====================================================
-- 1. 쿠팡 인증 정보 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS coupang_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 판매자 정보
    vendor_id VARCHAR(50) NOT NULL UNIQUE,  -- A00123456 형식
    vendor_name VARCHAR(255),

    -- API 인증 키 (쿠팡에서 발급)
    access_key VARCHAR(255) NOT NULL,
    secret_key VARCHAR(500) NOT NULL,

    -- 연동 상태
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupang_credentials_vendor_id
ON coupang_credentials(vendor_id);

COMMENT ON TABLE coupang_credentials IS '쿠팡 로켓그로스 API 인증 정보';
COMMENT ON COLUMN coupang_credentials.vendor_id IS '쿠팡 판매자 ID (A00123456 형식)';
COMMENT ON COLUMN coupang_credentials.access_key IS 'API Access Key';
COMMENT ON COLUMN coupang_credentials.secret_key IS 'API Secret Key (HMAC 서명용)';

-- =====================================================
-- 2. 쿠팡 상품 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS coupang_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 쿠팡 상품 식별자
    seller_product_id BIGINT NOT NULL UNIQUE,
    product_id BIGINT,                        -- 쿠팡 내부 상품 ID
    vendor_id VARCHAR(50) NOT NULL,

    -- 상품 정보
    seller_product_name VARCHAR(500),
    display_product_name VARCHAR(500),
    brand VARCHAR(255),
    manufacture VARCHAR(255),

    -- 카테고리
    display_category_code INTEGER,
    category_id INTEGER,

    -- 상태
    status_name VARCHAR(50),                  -- 승인완료, 심사중, 승인반려 등
    registration_type VARCHAR(20),            -- RFM (로켓그로스), NORMAL (하이브리드)

    -- 판매 기간
    sale_started_at TIMESTAMPTZ,
    sale_ended_at TIMESTAMPTZ,

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupang_products_vendor_id
ON coupang_products(vendor_id);

CREATE INDEX IF NOT EXISTS idx_coupang_products_status
ON coupang_products(status_name);

CREATE INDEX IF NOT EXISTS idx_coupang_products_synced_at
ON coupang_products(synced_at DESC);

COMMENT ON TABLE coupang_products IS '쿠팡 로켓그로스 상품';
COMMENT ON COLUMN coupang_products.seller_product_id IS '등록상품ID';
COMMENT ON COLUMN coupang_products.registration_type IS 'RFM: 로켓그로스, NORMAL: 하이브리드';

-- =====================================================
-- 3. 쿠팡 상품 옵션 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS coupang_product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 관계
    coupang_product_id UUID REFERENCES coupang_products(id) ON DELETE CASCADE,

    -- 쿠팡 옵션 식별자
    vendor_item_id BIGINT NOT NULL UNIQUE,    -- 가격/재고 수정 시 필요 (핵심 ID)
    vendor_inventory_item_id BIGINT,
    item_id BIGINT,

    -- 옵션 정보
    item_name VARCHAR(255),                   -- RED, S, XL 등
    external_vendor_sku VARCHAR(100),         -- 외부 SKU (우리 SKU)
    model_no VARCHAR(100),
    barcode VARCHAR(100),

    -- 가격
    original_price DECIMAL(12,2),
    sale_price DECIMAL(12,2),

    -- SKU 물류 정보
    sku_fragile BOOLEAN DEFAULT false,
    sku_height INTEGER,                       -- mm
    sku_length INTEGER,
    sku_width INTEGER,
    sku_weight INTEGER,                       -- g
    quantity_per_box INTEGER,
    distribution_period INTEGER,              -- 유통기간 (일)

    -- 내부 SKU 연결
    sku_id UUID REFERENCES products(id),

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupang_product_options_vendor_item_id
ON coupang_product_options(vendor_item_id);

CREATE INDEX IF NOT EXISTS idx_coupang_product_options_sku_id
ON coupang_product_options(sku_id);

CREATE INDEX IF NOT EXISTS idx_coupang_product_options_external_sku
ON coupang_product_options(external_vendor_sku);

COMMENT ON TABLE coupang_product_options IS '쿠팡 상품 옵션 (vendorItemId 기준)';
COMMENT ON COLUMN coupang_product_options.vendor_item_id IS '옵션ID - 가격/재고/판매상태 수정 시 사용';
COMMENT ON COLUMN coupang_product_options.external_vendor_sku IS '외부 SKU (우리 시스템 SKU와 매핑)';

-- =====================================================
-- 4. 쿠팡 재고 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS coupang_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 쿠팡 식별자
    vendor_id VARCHAR(50) NOT NULL,
    vendor_item_id BIGINT NOT NULL UNIQUE,
    external_sku_id BIGINT,

    -- 재고 정보
    total_orderable_quantity INTEGER DEFAULT 0,
    sales_count_last_30_days INTEGER DEFAULT 0,

    -- 메타
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupang_inventory_vendor_item_id
ON coupang_inventory(vendor_item_id);

CREATE INDEX IF NOT EXISTS idx_coupang_inventory_vendor_id
ON coupang_inventory(vendor_id);

COMMENT ON TABLE coupang_inventory IS '쿠팡 재고 정보';
COMMENT ON COLUMN coupang_inventory.total_orderable_quantity IS '주문 가능 재고';
COMMENT ON COLUMN coupang_inventory.sales_count_last_30_days IS '최근 30일 판매량';

-- =====================================================
-- 5. 쿠팡 동기화 로그 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS coupang_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    sync_type VARCHAR(20) NOT NULL,           -- 'orders', 'products', 'inventory'
    status VARCHAR(20) NOT NULL,              -- 'success', 'error', 'partial'

    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,

    date_from DATE,
    date_to DATE,

    error_message TEXT,
    duration_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupang_sync_logs_created_at
ON coupang_sync_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupang_sync_logs_sync_type
ON coupang_sync_logs(sync_type);

COMMENT ON TABLE coupang_sync_logs IS '쿠팡 동기화 로그';

-- =====================================================
-- 6. orders 테이블에 coupang 지원 확인
-- (shop_cd = 'coupang' 으로 저장됨)
-- =====================================================
-- orders 테이블은 이미 shop_cd 컬럼이 있으므로 추가 작업 불필요
-- 쿠팡 주문은 uniq = 'COUPANG-{orderId}-{vendorItemId}' 형식으로 저장

COMMENT ON COLUMN orders.shop_cd IS '쇼핑몰 코드: cafe24, naver, coupang';
