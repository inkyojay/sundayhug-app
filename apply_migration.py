#!/usr/bin/env python3
"""
Apply database migration using Python and psycopg2
This script reads the migration SQL file and applies it to the database.
"""
import os
import sys
import site

# Add user site-packages to path
user_site_packages = site.getusersitepackages()
if user_site_packages not in sys.path:
    sys.path.insert(0, user_site_packages)

import psycopg2
from psycopg2 import sql

def apply_migration():
    # Get DATABASE_URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    # Migration file path
    migration_file = './apps/dashboard/supabase/migrations/20260123_add_orders_composite_index.sql'

    # Read migration SQL
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
    except FileNotFoundError:
        print(f"ERROR: Migration file not found: {migration_file}")
        sys.exit(1)

    # Extract only the CREATE INDEX statement (ignore comments)
    # The actual SQL we need is around line 22-23
    create_index_sql = """
CREATE INDEX IF NOT EXISTS idx_orders_shop_cd_shop_ord_no_ord_time
ON orders(shop_cd, shop_ord_no, ord_time);
"""

    print("=" * 60)
    print("DATABASE MIGRATION - Apply Composite Index")
    print("=" * 60)
    print(f"\nMigration file: {migration_file}")
    print(f"Database: {database_url[:50]}...")
    print(f"\nSQL to execute:")
    print(create_index_sql)
    print("=" * 60)

    # Connect to database and apply migration
    conn = None
    try:
        print("\nConnecting to database...")
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Executing migration SQL...")
        cursor.execute(create_index_sql)

        print("✓ Migration executed successfully!")

        # Verify the index was created
        print("\nVerifying index creation...")
        cursor.execute("""
            SELECT indexname, tablename, indexdef
            FROM pg_indexes
            WHERE tablename = 'orders'
              AND indexname = 'idx_orders_shop_cd_shop_ord_no_ord_time';
        """)

        result = cursor.fetchone()
        if result:
            print("✓ Index verified successfully!")
            print(f"\n  Index name: {result[0]}")
            print(f"  Table name: {result[1]}")
            print(f"  Definition: {result[2]}")
        else:
            print("✗ WARNING: Index not found after creation")
            sys.exit(1)

        cursor.close()
        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)

    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            print("\nDatabase connection closed.")

if __name__ == '__main__':
    apply_migration()
