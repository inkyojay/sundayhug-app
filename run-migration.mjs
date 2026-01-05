import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://ugzwgegkvxcczwiottej.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnendnZWdrdnhjY3p3aW90dGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTcxMjY3MCwiZXhwIjoyMDc3Mjg4NjcwfQ.zvQQGhY4RkuVmvt1NxDG-UAvc0CFRKun7EbXv-hzM0I';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function run() {
  console.log('Checking if migration RPC exists...');

  // 1. exec_sql RPC 생성 시도 (이미 있으면 무시)
  const createRpcSql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_text;
      RETURN jsonb_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
  `;

  // 2. RPC 호출 시도
  const migration = fs.readFileSync('/Users/inkyo/Projects/sundayhug-app/supabase/migrations/012_add_coupang_tables.sql', 'utf8');

  // 먼저 테이블이 있는지 확인
  const { data: existing, error: checkError } = await supabase
    .from('coupang_credentials')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ Tables already exist!');
    return;
  }

  if (checkError.code !== '42P01' && checkError.code !== 'PGRST205' && !checkError.message.includes('does not exist')) {
    console.log('Unexpected error:', checkError);
    return;
  }

  console.log('Tables do not exist. Trying to create via Supabase Edge Function...');

  // Edge Function 호출로 migration 실행
  const { data, error } = await supabase.functions.invoke('run-migration', {
    body: { sql: migration }
  });

  if (error) {
    console.log('Edge function not available:', error.message);
    console.log('\n=== Supabase 대시보드에서 직접 SQL 실행 필요 ===');
    console.log('URL: https://supabase.com/dashboard/project/ugzwgegkvxcczwiottej/sql/new');
    console.log('\nSQL 내용을 클립보드에 복사합니다...');

    // 클립보드에 복사
    const { exec } = await import('child_process');
    exec(`cat "${'/Users/inkyo/Projects/sundayhug-app/supabase/migrations/012_add_coupang_tables.sql'}" | pbcopy`, (err) => {
      if (err) {
        console.log('클립보드 복사 실패. 파일을 직접 열어서 복사하세요:');
        console.log('/Users/inkyo/Projects/sundayhug-app/supabase/migrations/012_add_coupang_tables.sql');
      } else {
        console.log('✅ SQL이 클립보드에 복사되었습니다!');
        console.log('Supabase 대시보드 SQL Editor에 붙여넣기(Cmd+V) 후 실행하세요.');
      }
    });
  } else {
    console.log('Migration result:', data);
  }
}

run();
