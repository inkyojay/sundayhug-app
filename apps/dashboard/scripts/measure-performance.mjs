#!/usr/bin/env node
// =====================================================
// Performance Measurement Script (Node.js)
// =====================================================
// This script measures query performance before and after
// the composite index idx_orders_shop_cd_shop_ord_no_ord_time
//
// Usage:
//   cd apps/dashboard
//   node scripts/measure-performance.mjs
//
// Prerequisites:
// - pg package must be installed: npm install pg
// - DATABASE_URL environment variable must be set
// =====================================================

import pg from 'pg';
import { performance } from 'perf_hooks';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('');
  console.error('Set it with:');
  console.error('  export DATABASE_URL="postgresql://postgres.ugzwgegkvxcczwiottej:Wpdlzhvm0339@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"');
  process.exit(1);
}

// Helper function to extract execution time from EXPLAIN ANALYZE output
function extractExecutionTime(queryPlan) {
  const lastLine = queryPlan[queryPlan.length - 1]['QUERY PLAN'];
  const match = lastLine.match(/Execution Time: ([\d.]+) ms/);
  return match ? parseFloat(match[1]) : null;
}

// Helper function to check if index is used
function usesIndex(queryPlan) {
  const planText = queryPlan.map(r => r['QUERY PLAN']).join('\n');
  return planText.includes('idx_orders_shop_cd_shop_ord_no_ord_time');
}

// Helper function to get scan type
function getScanType(queryPlan) {
  const planText = queryPlan.map(r => r['QUERY PLAN']).join('\n');
  if (planText.includes('Index Scan using idx_orders_shop_cd_shop_ord_no_ord_time')) {
    return 'Index Scan';
  } else if (planText.includes('Bitmap Index Scan')) {
    return 'Bitmap Index Scan';
  } else if (planText.includes('Seq Scan')) {
    return 'Sequential Scan';
  }
  return 'Unknown';
}

async function measurePerformance() {
  const client = new pg.Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('==============================================');
    console.log('   Performance Measurement Script');
    console.log('==============================================');
    console.log('');
    console.log('Database:', DATABASE_URL.replace(/:\/\/.*@/, '://***@'));
    console.log('Date:', new Date().toISOString());
    console.log('');

    // Update table statistics
    console.log('==============================================');
    console.log('=== Updating table statistics ===');
    console.log('==============================================');
    await client.query('ANALYZE orders');
    console.log('✓ Statistics updated');
    console.log('');

    // Get table information
    console.log('==============================================');
    console.log('=== Table Information ===');
    console.log('==============================================');
    const tableInfo = await client.query(`
      SELECT
        COUNT(*) as total_rows,
        pg_size_pretty(pg_total_relation_size('orders')) as table_size,
        (SELECT COUNT(*) FROM orders WHERE shop_cd = 'cafe24') as cafe24_rows
      FROM orders
    `);
    console.table(tableInfo.rows);
    console.log('');

    // Check index status
    console.log('==============================================');
    console.log('=== Index Status ===');
    console.log('==============================================');
    const indexCheck = await client.query(`
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'orders'
              AND indexname = 'idx_orders_shop_cd_shop_ord_no_ord_time'
          ) THEN '✓ Index EXISTS'
          ELSE '✗ Index DOES NOT EXIST'
        END as index_status
    `);
    console.log(indexCheck.rows[0].index_status);
    console.log('');

    const results = [];

    // Query 1: Shop-filtered with time ordering
    console.log('==============================================');
    console.log('=== Query 1: Shop-filtered with time ordering ===');
    console.log('==============================================');
    await client.query('DISCARD PLANS');
    const q1Start = performance.now();
    const q1 = await client.query(`
      EXPLAIN (ANALYZE, BUFFERS, TIMING)
      SELECT id, shop_ord_no, shop_cd, ord_time, ord_status
      FROM orders
      WHERE shop_cd = 'cafe24'
      ORDER BY ord_time DESC
      LIMIT 100
    `);
    const q1End = performance.now();
    console.log(q1.rows.map(r => r['QUERY PLAN']).join('\n'));
    console.log('');

    const q1ExecutionTime = extractExecutionTime(q1.rows);
    const q1ScanType = getScanType(q1.rows);
    results.push({
      query: 'Query 1: Shop-filtered ordering',
      executionTime: q1ExecutionTime,
      scanType: q1ScanType,
      usesIndex: usesIndex(q1.rows)
    });

    // Query 2: Shop-filtered with time range
    console.log('==============================================');
    console.log('=== Query 2: Shop-filtered with time range ===');
    console.log('==============================================');
    await client.query('DISCARD PLANS');
    const q2Start = performance.now();
    const q2 = await client.query(`
      EXPLAIN (ANALYZE, BUFFERS, TIMING)
      SELECT id, shop_ord_no, shop_cd, ord_time, ord_status
      FROM orders
      WHERE shop_cd = 'cafe24'
        AND ord_time >= NOW() - INTERVAL '30 days'
      ORDER BY ord_time DESC
      LIMIT 100
    `);
    const q2End = performance.now();
    console.log(q2.rows.map(r => r['QUERY PLAN']).join('\n'));
    console.log('');

    const q2ExecutionTime = extractExecutionTime(q2.rows);
    const q2ScanType = getScanType(q2.rows);
    results.push({
      query: 'Query 2: Shop-filtered with time range',
      executionTime: q2ExecutionTime,
      scanType: q2ScanType,
      usesIndex: usesIndex(q2.rows)
    });

    // Query 3: Point lookup
    console.log('==============================================');
    console.log('=== Query 3: Point lookup by shop and order number ===');
    console.log('==============================================');
    await client.query('DISCARD PLANS');
    const q3Start = performance.now();
    const q3 = await client.query(`
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
      LIMIT 1
    `);
    const q3End = performance.now();
    console.log(q3.rows.map(r => r['QUERY PLAN']).join('\n'));
    console.log('');

    const q3ExecutionTime = extractExecutionTime(q3.rows);
    const q3ScanType = getScanType(q3.rows);
    results.push({
      query: 'Query 3: Point lookup',
      executionTime: q3ExecutionTime,
      scanType: q3ScanType,
      usesIndex: usesIndex(q3.rows)
    });

    // Index usage statistics
    console.log('==============================================');
    console.log('=== Index Usage Statistics ===');
    console.log('==============================================');
    const indexStats = await client.query(`
      SELECT
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_stat_user_indexes
      WHERE tablename = 'orders'
        AND indexname LIKE '%shop_cd%'
      ORDER BY indexname
    `);
    console.table(indexStats.rows);
    console.log('');

    // Summary
    console.log('==============================================');
    console.log('=== Performance Summary ===');
    console.log('==============================================');
    console.table(results);
    console.log('');

    // Check if all queries use index
    const allUseIndex = results.every(r => r.usesIndex);
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

    console.log('==============================================');
    console.log('   Measurement Complete');
    console.log('==============================================');
    console.log('');
    console.log('Summary:');
    console.log(`- All queries use index: ${allUseIndex ? '✓ YES' : '✗ NO'}`);
    console.log(`- Average execution time: ${avgExecutionTime.toFixed(2)} ms`);
    console.log('');
    console.log('Next Steps:');
    console.log('1. If you have baseline measurements, calculate improvement:');
    console.log('   Improvement % = ((Baseline - Current) / Baseline) × 100');
    console.log('2. Verify improvement meets >= 50% threshold');
    console.log('3. Document results in PERFORMANCE_RESULTS.md');
    console.log('');
    console.log('Expected for successful index usage:');
    console.log('- All queries should show Index Scan or Bitmap Index Scan');
    console.log('- Execution times should be low (< 50ms for typical queries)');
    console.log('- Improvement should be >= 50% compared to baseline');
    console.log('');

  } catch (error) {
    console.error('Error measuring performance:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the measurement
measurePerformance().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
