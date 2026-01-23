#!/bin/bash
# =====================================================
# Performance Measurement Script
# =====================================================
# This script measures query performance before and after
# the composite index idx_orders_shop_cd_shop_ord_no_ord_time
#
# Usage:
#   chmod +x apps/dashboard/scripts/measure-performance.sh
#   ./apps/dashboard/scripts/measure-performance.sh
#
# Prerequisites:
# - psql must be installed
# - DATABASE_URL environment variable must be set
# =====================================================

set -e  # Exit on error

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  echo ""
  echo "Set it with:"
  echo '  export DATABASE_URL="postgresql://postgres.ugzwgegkvxcczwiottej:Wpdlzhvm0339@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"'
  exit 1
fi

echo "=============================================="
echo "   Performance Measurement Script"
echo "=============================================="
echo ""
echo "Database: $(echo $DATABASE_URL | sed 's/:\/\/.*@/ ***@/')"
echo "Date: $(date)"
echo ""

# Update table statistics
echo "=============================================="
echo "=== Updating table statistics ==="
echo "=============================================="
psql "$DATABASE_URL" -c "ANALYZE orders;"
echo "✓ Statistics updated"
echo ""

# Get table size information
echo "=============================================="
echo "=== Table Information ==="
echo "=============================================="
psql "$DATABASE_URL" <<EOF
SELECT
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('orders')) as table_size,
  (SELECT COUNT(*) FROM orders WHERE shop_cd = 'cafe24') as cafe24_rows
FROM orders;
EOF
echo ""

# Check if index exists
echo "=============================================="
echo "=== Index Status ==="
echo "=============================================="
psql "$DATABASE_URL" <<EOF
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'orders'
        AND indexname = 'idx_orders_shop_cd_shop_ord_no_ord_time'
    ) THEN '✓ Index EXISTS'
    ELSE '✗ Index DOES NOT EXIST'
  END as index_status;
EOF
echo ""

# Query 1: Shop-filtered with time ordering
echo "=============================================="
echo "=== Query 1: Shop-filtered with time ordering ==="
echo "=============================================="
psql "$DATABASE_URL" <<EOF
DISCARD PLANS;
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT id, shop_ord_no, shop_cd, ord_time, ord_status
FROM orders
WHERE shop_cd = 'cafe24'
ORDER BY ord_time DESC
LIMIT 100;
EOF
echo ""

# Query 2: Shop-filtered with time range
echo "=============================================="
echo "=== Query 2: Shop-filtered with time range ==="
echo "=============================================="
psql "$DATABASE_URL" <<EOF
DISCARD PLANS;
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT id, shop_ord_no, shop_cd, ord_time, ord_status
FROM orders
WHERE shop_cd = 'cafe24'
  AND ord_time >= NOW() - INTERVAL '30 days'
ORDER BY ord_time DESC
LIMIT 100;
EOF
echo ""

# Query 3: Point lookup (using a real order if exists)
echo "=============================================="
echo "=== Query 3: Point lookup by shop and order number ==="
echo "=============================================="
psql "$DATABASE_URL" <<EOF
DISCARD PLANS;
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT id, shop_ord_no, shop_cd, ord_time, ord_status
FROM orders
WHERE shop_cd = 'cafe24'
  AND shop_ord_no = (
    SELECT shop_ord_no FROM orders
    WHERE shop_cd = 'cafe24'
    ORDER BY ord_time DESC
    LIMIT 1
  )
LIMIT 1;
EOF
echo ""

# Index usage statistics
echo "=============================================="
echo "=== Index Usage Statistics ==="
echo "=============================================="
psql "$DATABASE_URL" <<EOF
SELECT
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
  AND indexname LIKE '%shop_cd%'
ORDER BY indexname;
EOF
echo ""

echo "=============================================="
echo "   Measurement Complete"
echo "=============================================="
echo ""
echo "Next Steps:"
echo "1. Review the 'Execution Time' values from each query"
echo "2. Note whether 'Index Scan' or 'Seq Scan' is used"
echo "3. Calculate improvement percentages if comparing before/after"
echo "4. Document results in PERFORMANCE_RESULTS.md"
echo ""
echo "Expected for successful index usage:"
echo "- Query plans should show 'Index Scan using idx_orders_shop_cd_shop_ord_no_ord_time'"
echo "- Execution times should be significantly lower with index"
echo "- Improvement should be >= 50%"
echo ""
