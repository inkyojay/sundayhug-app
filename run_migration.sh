#!/bin/bash
# =====================================================
# Database Migration Runner
# This script applies the composite index migration
# =====================================================

set -e  # Exit on error

echo "============================================================"
echo "DATABASE MIGRATION - Apply Composite Index"
echo "============================================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set DATABASE_URL before running this script:"
    echo ""
    echo "  Option 1: Export in current shell"
    echo "    export DATABASE_URL='postgresql://...'"
    echo "    ./run_migration.sh"
    echo ""
    echo "  Option 2: Create apps/dashboard/.env file with:"
    echo "    DATABASE_URL=postgresql://..."
    echo "    source apps/dashboard/.env"
    echo "    ./run_migration.sh"
    echo ""
    echo "  Option 3: Pass inline"
    echo "    DATABASE_URL='postgresql://...' ./run_migration.sh"
    echo ""
    exit 1
fi

# Source .env if it exists
if [ -f "./apps/dashboard/.env" ]; then
    echo "📁 Loading environment from apps/dashboard/.env"
    set -a
    source ./apps/dashboard/.env
    set +a
fi

echo "🔌 Database: ${DATABASE_URL:0:50}..."
echo "📄 Migration: apps/dashboard/supabase/migrations/20260123_add_orders_composite_index.sql"
echo ""
echo "============================================================"
echo ""

# Run the Python migration script
echo "🚀 Executing migration..."
python3 ./apply_migration.py

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Verify index: psql \"\$DATABASE_URL\" -c \"\\di idx_orders_shop_cd_shop_ord_no_ord_time\""
    echo "  2. Test performance: See .auto-claude/specs/001-/PERFORMANCE_MEASUREMENT_GUIDE.md"
    echo ""
else
    echo ""
    echo "❌ Migration failed with exit code: $exit_code"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check DATABASE_URL is correct"
    echo "  - Verify database is accessible"
    echo "  - Check network connectivity"
    echo "  - Ensure orders table exists"
    echo ""
    exit $exit_code
fi
