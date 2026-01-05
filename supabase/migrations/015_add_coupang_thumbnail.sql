-- =====================================================
-- 쿠팡 상품 썸네일 컬럼 추가
-- 생성일: 2026-01-05
-- =====================================================

-- coupang_products 테이블에 썸네일 URL 컬럼 추가
ALTER TABLE coupang_products
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN coupang_products.thumbnail_url IS '상품 대표 이미지 URL (CDN)';
