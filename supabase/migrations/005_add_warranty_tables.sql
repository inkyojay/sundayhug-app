-- =====================================================
-- 썬데이허그 - 디지털 보증서 시스템 스키마
-- 생성일: 2025-11-27
-- 용도: 제품 보증서 등록, 관리, A/S 신청
-- =====================================================

-- =====================================================
-- 1. customers (고객 정보)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 기본 정보
    name VARCHAR(100),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    
    -- 카카오 인증 정보
    kakao_id VARCHAR(100) UNIQUE,
    kakao_nickname VARCHAR(100),
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_kakao_id ON customers(kakao_id);

-- 코멘트
COMMENT ON TABLE customers IS '보증서 등록 고객 정보';
COMMENT ON COLUMN customers.phone IS '고객 연락처 (보증서 검증용)';
COMMENT ON COLUMN customers.kakao_id IS '카카오 인증 후 저장되는 고유 ID';

-- =====================================================
-- 2. warranty_products (보증 대상 제품)
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 제품 정보
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    
    -- 보증 설정
    warranty_months INTEGER DEFAULT 12,
    
    -- 제품 이미지 (보증서 표시용)
    product_image_url TEXT,
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 코멘트
COMMENT ON TABLE warranty_products IS '보증 대상 제품 마스터';
COMMENT ON COLUMN warranty_products.warranty_months IS '기본 보증 기간 (개월)';

-- =====================================================
-- 3. warranties (보증서)
-- =====================================================
CREATE TABLE IF NOT EXISTS warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 보증서 번호 (자동 생성: SH-W-YYYYMMDD-XXXX)
    warranty_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- 연결 정보
    customer_id UUID REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    warranty_product_id UUID REFERENCES warranty_products(id),
    
    -- 검증 정보 (고객 입력)
    tracking_number VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    
    -- 주문 정보 스냅샷 (검증 당시)
    product_name VARCHAR(255),
    product_option VARCHAR(255),
    order_date DATE,
    sales_channel VARCHAR(50),
    
    -- 보증 기간
    warranty_start DATE NOT NULL,
    warranty_end DATE NOT NULL,
    
    -- 제품 인증 사진
    product_photo_url TEXT,
    photo_uploaded_at TIMESTAMPTZ,
    
    -- 상태 관리
    -- pending: 승인대기, approved: 승인완료, rejected: 거절, expired: 만료
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(100),
    rejection_reason TEXT,
    
    -- 카카오 알림톡 발송
    kakao_sent BOOLEAN DEFAULT FALSE,
    kakao_sent_at TIMESTAMPTZ,
    kakao_message_id VARCHAR(100),
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_warranties_status ON warranties(status);
CREATE INDEX idx_warranties_customer_id ON warranties(customer_id);
CREATE INDEX idx_warranties_tracking_number ON warranties(tracking_number);
CREATE INDEX idx_warranties_customer_phone ON warranties(customer_phone);
CREATE INDEX idx_warranties_warranty_end ON warranties(warranty_end);
CREATE INDEX idx_warranties_created_at ON warranties(created_at DESC);

-- 코멘트
COMMENT ON TABLE warranties IS '디지털 보증서 마스터 테이블';
COMMENT ON COLUMN warranties.warranty_number IS '보증서 고유번호 (SH-W-YYYYMMDD-XXXX)';
COMMENT ON COLUMN warranties.status IS '상태: pending(승인대기), approved(승인완료), rejected(거절), expired(만료)';

-- =====================================================
-- 4. as_requests (A/S 신청)
-- =====================================================
CREATE TABLE IF NOT EXISTS as_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 보증서 연결
    warranty_id UUID REFERENCES warranties(id) ON DELETE CASCADE,
    
    -- 신청 정보
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('repair', 'exchange', 'refund', 'inquiry')),
    issue_description TEXT NOT NULL,
    issue_photos TEXT[],
    
    -- 연락처 (보증서와 다를 수 있음)
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    
    -- 처리 정보
    -- received: 접수, processing: 처리중, completed: 완료, cancelled: 취소
    status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'cancelled')),
    assigned_to VARCHAR(100),
    resolution TEXT,
    completed_at TIMESTAMPTZ,
    
    -- 카카오 알림
    kakao_sent BOOLEAN DEFAULT FALSE,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_as_requests_warranty_id ON as_requests(warranty_id);
CREATE INDEX idx_as_requests_status ON as_requests(status);
CREATE INDEX idx_as_requests_created_at ON as_requests(created_at DESC);

-- 코멘트
COMMENT ON TABLE as_requests IS 'A/S 신청 테이블';
COMMENT ON COLUMN as_requests.request_type IS '신청 유형: repair(수리), exchange(교환), refund(환불), inquiry(문의)';

-- =====================================================
-- 5. warranty_logs (보증서 이력)
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    warranty_id UUID REFERENCES warranties(id) ON DELETE CASCADE,
    
    -- 이력 정보
    action VARCHAR(50) NOT NULL,
    description TEXT,
    performed_by VARCHAR(100),
    
    -- 변경 전/후 데이터 (JSON)
    previous_data JSONB,
    new_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_warranty_logs_warranty_id ON warranty_logs(warranty_id);
CREATE INDEX idx_warranty_logs_created_at ON warranty_logs(created_at DESC);

-- 코멘트
COMMENT ON TABLE warranty_logs IS '보증서 변경 이력';

-- =====================================================
-- 6. 보증서 번호 생성 함수
-- =====================================================
CREATE OR REPLACE FUNCTION generate_warranty_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    seq_num INTEGER;
    new_number TEXT;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- 오늘 생성된 보증서 수 + 1
    SELECT COALESCE(COUNT(*) + 1, 1)
    INTO seq_num
    FROM warranties
    WHERE warranty_number LIKE 'SH-W-' || today_str || '-%';
    
    -- 형식: SH-W-YYYYMMDD-XXXX
    new_number := 'SH-W-' || today_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. 보증서 통계 뷰
-- =====================================================
CREATE OR REPLACE VIEW warranty_stats AS
SELECT 
    COUNT(*) as total_warranties,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
    COUNT(*) FILTER (WHERE status = 'approved' AND warranty_end < NOW()) as expiring_soon,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week
FROM warranties;

COMMENT ON VIEW warranty_stats IS '보증서 통계 뷰 (대시보드용)';

-- =====================================================
-- 8. 승인 대기 보증서 뷰
-- =====================================================
CREATE OR REPLACE VIEW warranty_pending_list AS
SELECT 
    w.id,
    w.warranty_number,
    w.tracking_number,
    w.customer_phone,
    w.product_name,
    w.product_option,
    w.product_photo_url,
    w.created_at,
    c.name as customer_name,
    c.kakao_nickname
FROM warranties w
LEFT JOIN customers c ON w.customer_id = c.id
WHERE w.status = 'pending'
ORDER BY w.created_at ASC;

COMMENT ON VIEW warranty_pending_list IS '승인 대기 보증서 목록';

-- =====================================================
-- 9. Row Level Security (RLS)
-- =====================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE as_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_logs ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 읽기 권한
CREATE POLICY "Enable read for authenticated" ON customers
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read for authenticated" ON warranty_products
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read for authenticated" ON warranties
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read for authenticated" ON as_requests
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read for authenticated" ON warranty_logs
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Service Role 전체 권한 (Edge Function용)
CREATE POLICY "Enable all for service role" ON customers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON warranty_products
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON warranties
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON as_requests
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON warranty_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 고객 본인 데이터 접근 (카카오 인증 후)
CREATE POLICY "Enable customer own data" ON warranties
    FOR SELECT USING (
        customer_phone = current_setting('app.current_user_phone', true)
        OR auth.role() = 'authenticated'
    );

-- =====================================================
-- 10. updated_at 트리거
-- =====================================================
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warranty_products_updated_at
    BEFORE UPDATE ON warranty_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warranties_updated_at
    BEFORE UPDATE ON warranties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_as_requests_updated_at
    BEFORE UPDATE ON as_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. 초기 데이터 (보증 대상 제품)
-- =====================================================
INSERT INTO warranty_products (product_code, product_name, category, warranty_months) VALUES
    ('CB-001', '접이식 아기침대', '침대', 12),
    ('CB-002', '접이식 아기침대 프리미엄', '침대', 24)
ON CONFLICT (product_code) DO NOTHING;

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ 보증서 시스템 테이블 생성 완료!';
    RAISE NOTICE '📊 생성된 테이블: customers, warranty_products, warranties, as_requests, warranty_logs';
    RAISE NOTICE '👁️ 생성된 뷰: warranty_stats, warranty_pending_list';
    RAISE NOTICE '🔧 생성된 함수: generate_warranty_number()';
    RAISE NOTICE '🔒 RLS 정책 활성화 완료';
END $$;

