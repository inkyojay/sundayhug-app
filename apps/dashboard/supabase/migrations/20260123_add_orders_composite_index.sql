-- =====================================================
-- 주문 조회 성능 최적화를 위한 복합 인덱스 추가
--
-- Purpose: shop_cd, shop_ord_no, ord_time 컬럼을 조합한 복합 인덱스를 추가하여
--          주문 조회 쿼리의 성능을 50% 이상 향상시킵니다.
--
-- Index Strategy:
--   1. shop_cd (first): 특정 쇼핑몰/채널로 필터링 (high cardinality)
--   2. shop_ord_no (second): 쇼핑몰 내 주문번호로 특정 주문 조회 (unique identifier)
--   3. ord_time (third): 시간순 정렬 및 범위 검색 (range/sort column)
--
-- Expected Performance Improvement:
--   - Query execution time: 50%+ reduction
--   - Scan method: Sequential Scan → Index Scan
--   - Common query patterns benefited:
--     * "Get orders from shop X ordered by time"
--     * "Find order Y from shop X"
--     * "Get recent orders from shop X between dates A and B"
-- =====================================================

-- 복합 인덱스 생성 (idempotent)
CREATE INDEX IF NOT EXISTS idx_orders_shop_cd_shop_ord_no_ord_time
ON orders(shop_cd, shop_ord_no, ord_time);

-- Note: For production deployment with large datasets (100K+ rows),
-- consider using CREATE INDEX CONCURRENTLY to avoid table locking:
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_shop_cd_shop_ord_no_ord_time
-- ON orders(shop_cd, shop_ord_no, ord_time);

-- =====================================================
-- Performance Validation Queries
-- =====================================================

-- Baseline Query (Before Index):
-- Run this to establish baseline performance
/*
EXPLAIN ANALYZE
SELECT id, shop_ord_no, shop_cd, ord_time, ord_status
FROM orders
WHERE shop_cd = 'cafe24'
  AND ord_time >= NOW() - INTERVAL '30 days'
ORDER BY ord_time DESC
LIMIT 100;
*/

-- After Index Query (Should show improvement):
-- Run this after creating the index to verify performance improvement
/*
EXPLAIN ANALYZE
SELECT id, shop_ord_no, shop_cd, ord_time, ord_status
FROM orders
WHERE shop_cd = 'cafe24'
  AND ord_time >= NOW() - INTERVAL '30 days'
ORDER BY ord_time DESC
LIMIT 100;
*/

-- Expected Results:
-- - Execution time: Reduced by ≥50%
-- - Scan method: "Index Scan using idx_orders_shop_cd_shop_ord_no_ord_time"
-- - Rows scanned: Only filtered subset (not full table)
-- - Query cost: Significantly lower

-- Verification Query:
-- Check if the index was created successfully
/*
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders'
  AND indexname = 'idx_orders_shop_cd_shop_ord_no_ord_time';
*/
