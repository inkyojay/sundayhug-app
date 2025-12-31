-- =====================================================
-- B2B 주문 관리 시스템 테이블
-- =====================================================

-- =====================================================
-- 1. B2B 고객(업체) 마스터 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 기본 정보
    customer_code VARCHAR(50) UNIQUE NOT NULL,          -- 업체 코드 (B2B-001)
    company_name VARCHAR(255) NOT NULL,                  -- 회사명
    company_name_en VARCHAR(255),                        -- 회사명 (영문)
    business_type VARCHAR(50) NOT NULL DEFAULT 'domestic', -- domestic / overseas
    country_code VARCHAR(10) DEFAULT 'KR',               -- 국가 코드 (ISO 3166-1)

    -- 사업자 정보 (국내)
    business_registration_no VARCHAR(50),                -- 사업자등록번호
    representative_name VARCHAR(100),                    -- 대표자명

    -- 담당자 정보
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    contact_position VARCHAR(50),                        -- 담당자 직함

    -- 주소 정보
    address TEXT,
    address_en TEXT,                                     -- 주소 (영문, 해외용)
    shipping_address TEXT,                               -- 배송지 주소
    shipping_address_en TEXT,

    -- 거래 조건
    payment_terms VARCHAR(100),                          -- 결제 조건 (선불, 30일 후불 등)
    credit_limit DECIMAL(15,2) DEFAULT 0,                -- 여신 한도
    currency VARCHAR(10) DEFAULT 'KRW',                  -- 거래 통화

    -- 상태
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_b2b_customers_code ON b2b_customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_b2b_customers_business_type ON b2b_customers(business_type);
CREATE INDEX IF NOT EXISTS idx_b2b_customers_is_active ON b2b_customers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_b2b_customers_is_deleted ON b2b_customers(is_deleted) WHERE is_deleted = false;

COMMENT ON TABLE b2b_customers IS 'B2B 거래처(업체) 마스터 테이블';

-- =====================================================
-- 2. B2B 업체별 가격표 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_customer_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    customer_id UUID NOT NULL REFERENCES b2b_customers(id) ON DELETE CASCADE,
    parent_sku VARCHAR(100) NOT NULL REFERENCES parent_products(parent_sku) ON DELETE CASCADE,

    -- 가격 정보 (색상/사이즈 상관없이 동일 가격)
    unit_price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'KRW',

    -- 유효 기간
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,

    -- 메타
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 동일 업체-제품 조합은 하나만 존재
    UNIQUE(customer_id, parent_sku)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_b2b_customer_prices_customer ON b2b_customer_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_customer_prices_parent_sku ON b2b_customer_prices(parent_sku);

COMMENT ON TABLE b2b_customer_prices IS '업체별 제품 가격표 (parent_sku 기준)';

-- =====================================================
-- 3. B2B 주문 (견적서/발주) 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 주문 기본 정보
    order_number VARCHAR(50) UNIQUE NOT NULL,            -- 주문번호 (B2B-20251231-0001)
    customer_id UUID REFERENCES b2b_customers(id) ON DELETE SET NULL,

    -- 주문 상태 흐름
    -- quote_draft -> quote_sent -> confirmed -> invoice_created -> shipping -> shipped -> completed / cancelled
    status VARCHAR(50) NOT NULL DEFAULT 'quote_draft',

    -- 날짜
    order_date DATE DEFAULT CURRENT_DATE,
    quote_valid_until DATE,                              -- 견적 유효일
    confirmed_at TIMESTAMPTZ,                            -- 주문 확정일
    shipped_at TIMESTAMPTZ,                              -- 출고일

    -- 금액 정보
    currency VARCHAR(10) DEFAULT 'KRW',
    subtotal DECIMAL(15,2) DEFAULT 0,                    -- 소계
    discount_amount DECIMAL(15,2) DEFAULT 0,             -- 할인
    shipping_cost DECIMAL(15,2) DEFAULT 0,               -- 배송비
    tax_amount DECIMAL(15,2) DEFAULT 0,                  -- 세금
    total_amount DECIMAL(15,2) DEFAULT 0,                -- 총액

    -- 배송 정보
    shipping_method VARCHAR(100),                        -- 배송 방법
    shipping_address TEXT,
    shipping_address_en TEXT,
    tracking_number VARCHAR(100),

    -- 결제 정보
    payment_terms VARCHAR(100),
    payment_status VARCHAR(50) DEFAULT 'pending',        -- pending, partial, paid

    -- 문서 관련
    proforma_invoice_no VARCHAR(50),                     -- Proforma Invoice 번호
    commercial_invoice_no VARCHAR(50),                   -- Commercial Invoice 번호

    -- 메모
    internal_notes TEXT,                                 -- 내부 메모
    customer_notes TEXT,                                 -- 고객 요청사항

    -- 상태
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_b2b_orders_customer ON b2b_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_status ON b2b_orders(status);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_order_date ON b2b_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_number ON b2b_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_is_deleted ON b2b_orders(is_deleted) WHERE is_deleted = false;

COMMENT ON TABLE b2b_orders IS 'B2B 주문 마스터 테이블 (견적서/발주)';

-- =====================================================
-- 4. B2B 주문 품목 (견적 품목) - Parent SKU 기준
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    order_id UUID NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
    parent_sku VARCHAR(100) REFERENCES parent_products(parent_sku) ON DELETE SET NULL,

    -- 제품 정보 (스냅샷)
    product_name VARCHAR(255) NOT NULL,
    product_name_en VARCHAR(255),

    -- 수량 및 가격
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(15,2) NOT NULL,
    discount_rate DECIMAL(5,2) DEFAULT 0,                -- 할인율 (%)
    line_total DECIMAL(15,2) NOT NULL,                   -- quantity * unit_price * (1 - discount_rate/100)

    -- 메모
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_b2b_order_items_order ON b2b_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_b2b_order_items_parent_sku ON b2b_order_items(parent_sku);

COMMENT ON TABLE b2b_order_items IS 'B2B 주문 품목 (Parent SKU 기준, 견적용)';

-- =====================================================
-- 5. B2B 출고 지시 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    order_id UUID NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
    shipment_number VARCHAR(50) UNIQUE NOT NULL,         -- 출고번호 (SHP-20251231-0001)

    -- 상태
    status VARCHAR(50) NOT NULL DEFAULT 'pending',       -- pending, preparing, shipped, delivered

    -- 날짜
    planned_date DATE,                                   -- 출고 예정일
    shipped_date DATE,                                   -- 실제 출고일
    delivered_date DATE,                                 -- 배송 완료일

    -- 배송 정보
    shipping_method VARCHAR(100),
    carrier_name VARCHAR(100),                           -- 택배사명
    tracking_number VARCHAR(100),

    -- 금액
    shipping_cost DECIMAL(15,2) DEFAULT 0,

    -- 메모
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_order ON b2b_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_status ON b2b_shipments(status);
CREATE INDEX IF NOT EXISTS idx_b2b_shipments_number ON b2b_shipments(shipment_number);

COMMENT ON TABLE b2b_shipments IS 'B2B 출고 지시 테이블';

-- =====================================================
-- 6. B2B 출고 상세 품목 - SKU 단위
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_shipment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    shipment_id UUID NOT NULL REFERENCES b2b_shipments(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES b2b_order_items(id) ON DELETE SET NULL,

    -- SKU 정보 (세부 제품)
    sku VARCHAR(100) REFERENCES products(sku) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,

    -- 제품 정보 (스냅샷)
    product_name VARCHAR(255) NOT NULL,
    color VARCHAR(100),
    size VARCHAR(50),

    -- 수량
    quantity INTEGER NOT NULL DEFAULT 0,

    -- 박스 정보 (패킹리스트용)
    box_number INTEGER,                                  -- 박스 번호

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_b2b_shipment_items_shipment ON b2b_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_b2b_shipment_items_sku ON b2b_shipment_items(sku);

COMMENT ON TABLE b2b_shipment_items IS 'B2B 출고 상세 품목 (SKU 단위)';

-- =====================================================
-- 7. B2B 문서 테이블 (생성된 문서 이력)
-- =====================================================
CREATE TABLE IF NOT EXISTS b2b_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    order_id UUID REFERENCES b2b_orders(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES b2b_shipments(id) ON DELETE SET NULL,

    -- 문서 타입
    document_type VARCHAR(50) NOT NULL,                  -- quote_kr, proforma_invoice, commercial_invoice, packing_list
    document_number VARCHAR(50),                         -- 문서 번호

    -- 파일 정보
    file_url TEXT,                                       -- 저장된 파일 URL
    file_name VARCHAR(255),

    -- 메타
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID,                                   -- 생성한 사용자

    notes TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_b2b_documents_order ON b2b_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_b2b_documents_type ON b2b_documents(document_type);

COMMENT ON TABLE b2b_documents IS 'B2B 생성된 문서 이력';

-- =====================================================
-- RLS 정책 (Row Level Security)
-- =====================================================

-- b2b_customers
ALTER TABLE b2b_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON b2b_customers
    FOR ALL USING (auth.role() = 'authenticated');

-- b2b_customer_prices
ALTER TABLE b2b_customer_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON b2b_customer_prices
    FOR ALL USING (auth.role() = 'authenticated');

-- b2b_orders
ALTER TABLE b2b_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON b2b_orders
    FOR ALL USING (auth.role() = 'authenticated');

-- b2b_order_items
ALTER TABLE b2b_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON b2b_order_items
    FOR ALL USING (auth.role() = 'authenticated');

-- b2b_shipments
ALTER TABLE b2b_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON b2b_shipments
    FOR ALL USING (auth.role() = 'authenticated');

-- b2b_shipment_items
ALTER TABLE b2b_shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON b2b_shipment_items
    FOR ALL USING (auth.role() = 'authenticated');

-- b2b_documents
ALTER TABLE b2b_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON b2b_documents
    FOR ALL USING (auth.role() = 'authenticated');
