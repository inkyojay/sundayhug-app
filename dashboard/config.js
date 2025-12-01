// =====================================================
// Supabase 설정 파일
// =====================================================
// 아래 값들을 본인의 Supabase 프로젝트 정보로 교체하세요
// Supabase 대시보드 → Settings → API 에서 확인 가능

const SUPABASE_CONFIG = {
    // Supabase Project URL
    // 예시: https://xxxxxxxxxxxxx.supabase.co
    url: 'https://ugzwgegkvxcczwiottej.supabase.co',
    
    // Supabase Anon/Public Key
    // 예시: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnendnZWdrdnhjY3p3aW90dGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTI2NzAsImV4cCI6MjA3NzI4ODY3MH0._ezV2r8kAvjIlovx6U_L0XzW9nWtSR0MY-RpMISPK38',
    
    // Edge Function URL (재고 동기화)
    // 예시: https://xxxxxxxxxxxxx.supabase.co/functions/v1/sync-inventory
    syncInventoryUrl: 'https://ugzwgegkvxcczwiottej.supabase.co/functions/v1/sync-inventory-simple',
    
    // Edge Function URL (노션 동기화)
    syncNotionUrl: 'https://ugzwgegkvxcczwiottej.supabase.co/functions/v1/sync-notion-products',
};

// 설정 유효성 검증
if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || 
    SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('❌ config.js 파일에서 Supabase 설정을 입력해주세요!');
    console.info('📝 Supabase 대시보드 → Settings → API 에서 값을 복사하세요');
}

