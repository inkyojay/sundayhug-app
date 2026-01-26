#!/usr/bin/env node
/**
 * Apply SQL Migration Script
 *
 * This script applies a SQL migration file to the database using the postgres package.
 * Usage: node scripts/apply-migration.mjs <migration-file-path>
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  // Get migration file path from command line args
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Error: Migration file path is required');
    console.error('Usage: node scripts/apply-migration.mjs <migration-file-path>');
    process.exit(1);
  }

  // Database URL from spec
  const DATABASE_URL = process.env.DATABASE_URL ||
    'postgresql://postgres.ugzwgegkvxcczwiottej:Wpdlzhvm0339@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

  // Create postgres client
  const sql = postgres(DATABASE_URL, {
    max: 1, // Only need one connection for migration
  });

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', migrationFile);
    console.log(`Reading migration from: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Apply migration
    console.log('Applying migration...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration applied successfully!');

    // Verify the index was created
    const result = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'orders'
      AND indexname = 'idx_orders_shop_cd_shop_ord_no_ord_time'
    `;

    if (result.length > 0) {
      console.log('\n✅ Index verification:');
      console.log('Index name:', result[0].indexname);
      console.log('Index definition:', result[0].indexdef);
    } else {
      console.log('\n⚠️  Warning: Index not found in pg_indexes');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
