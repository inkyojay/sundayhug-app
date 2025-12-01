// =====================================================
// 썬데이허그 재고 관리 시스템 - 메인 스크립트
// =====================================================

// Supabase 클라이언트 초기화
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// 전역 변수
let inventoryData = [];
let logsData = [];
let ordersData = [];
let orderLogsData = [];
let currentTab = 'inventory';

// =====================================================
// 초기화
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 관리 시스템 시작');
    
    // 이벤트 리스너 등록
    initEventListeners();
    
    // 초기 데이터 로드
    loadInventory();
    loadSyncLogs();
    
    // 날짜 필터 초기값 설정 (최근 7일)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    document.getElementById('endDateFilter').valueAsDate = endDate;
    document.getElementById('startDateFilter').valueAsDate = startDate;
    
    // 실시간 구독 설정
    subscribeToRealtimeUpdates();
});

// =====================================================
// 이벤트 리스너
// =====================================================
function initEventListeners() {
    // 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 동기화 버튼
    document.getElementById('syncBtn').addEventListener('click', () => {
        console.log('🔘 동기화 버튼 클릭, 현재 탭:', currentTab);
        if (currentTab === 'inventory') {
            console.log('📦 재고 동기화 실행');
            triggerSync();
        } else if (currentTab === 'orders') {
            console.log('🛒 주문 동기화 실행');
            triggerOrderSync();
        }
    });
    const syncBtnEmpty = document.getElementById('syncBtnEmpty');
    if (syncBtnEmpty) {
        syncBtnEmpty.addEventListener('click', triggerSync);
    }
    
    const syncOrdersBtnEmpty = document.getElementById('syncOrdersBtnEmpty');
    if (syncOrdersBtnEmpty) {
        syncOrdersBtnEmpty.addEventListener('click', triggerOrderSync);
    }
    
    // 새로고침 버튼
    document.getElementById('refreshBtn').addEventListener('click', () => {
        if (currentTab === 'inventory') {
            loadInventory();
            loadSyncLogs();
        } else {
            loadOrders();
            loadOrderSyncLogs();
        }
    });
    
    // 재고 검색 및 필터
    document.getElementById('searchInput').addEventListener('input', filterInventory);
    document.getElementById('statusFilter').addEventListener('change', filterInventory);
    
    // 주문 검색 및 필터
    const orderSearchInput = document.getElementById('orderSearchInput');
    if (orderSearchInput) orderSearchInput.addEventListener('input', filterOrders);
    
    const shopFilter = document.getElementById('shopFilter');
    if (shopFilter) shopFilter.addEventListener('change', filterOrders);
    
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) orderStatusFilter.addEventListener('change', filterOrders);
    
    const startDateFilter = document.getElementById('startDateFilter');
    if (startDateFilter) startDateFilter.addEventListener('change', filterOrders);
    
    const endDateFilter = document.getElementById('endDateFilter');
    if (endDateFilter) endDateFilter.addEventListener('change', filterOrders);
    
    // 로그 토글
    const toggleLogsBtn = document.getElementById('toggleLogs');
    if (toggleLogsBtn) toggleLogsBtn.addEventListener('click', toggleLogs);
    
    const toggleOrdersLogsBtn = document.getElementById('toggleOrdersLogs');
    if (toggleOrdersLogsBtn) toggleOrdersLogsBtn.addEventListener('click', toggleOrdersLogs);
}

// =====================================================
// 재고 데이터 로드
// =====================================================
async function loadInventory() {
    showLoadingState();
    
    try {
        // inventory_summary 뷰에서 데이터 조회
        const { data, error } = await supabase
            .from('inventory_summary')
            .select('*')
            .order('synced_at', { ascending: false });
        
        if (error) throw error;
        
        inventoryData = data || [];
        
        if (inventoryData.length === 0) {
            showEmptyState();
        } else {
            showTableState();
            renderInventoryTable(inventoryData);
            updateStatistics(inventoryData);
            updateLastSyncTime();
        }
        
    } catch (error) {
        console.error('❌ 재고 데이터 로드 실패:', error);
        showErrorState(error.message);
    }
}

// =====================================================
// 재고 테이블 렌더링
// =====================================================
function renderInventoryTable(data) {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #6b7280;">
                    검색 결과가 없습니다
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        
        // 상태 배지 클래스
        let statusClass = 'success';
        if (item.stock_status === '재고부족') statusClass = 'warning';
        if (item.stock_status === '품절') statusClass = 'danger';
        
        // 재고 변동 표시
        let changeHtml = '-';
        if (item.stock_change !== null && item.stock_change !== 0) {
            const changeClass = item.stock_change > 0 ? 'positive' : 'negative';
            const changeSign = item.stock_change > 0 ? '+' : '';
            changeHtml = `<span class="stock-change ${changeClass}">${changeSign}${item.stock_change}</span>`;
        }
        
        // 날짜 포맷
        const syncedDate = item.synced_at 
            ? new Date(item.synced_at).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })
            : '-';
        
        row.innerHTML = `
            <td>
                <span class="status-badge ${statusClass}">
                    ${item.stock_status || '-'}
                </span>
            </td>
            <td><strong>${item.sku || '-'}</strong></td>
            <td>${item.product_name || '-'}</td>
            <td><strong>${item.current_stock ?? '-'}</strong></td>
            <td>${changeHtml}</td>
            <td>${item.alert_threshold ?? 10}</td>
            <td style="font-size: 0.875rem; color: #6b7280;">${syncedDate}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// =====================================================
// 통계 업데이트
// =====================================================
function updateStatistics(data) {
    const total = data.length;
    const normal = data.filter(item => item.stock_status === '정상').length;
    const low = data.filter(item => item.stock_status === '재고부족').length;
    const out = data.filter(item => item.stock_status === '품절').length;
    
    document.getElementById('totalProducts').textContent = total;
    document.getElementById('normalStock').textContent = normal;
    document.getElementById('lowStock').textContent = low;
    document.getElementById('outOfStock').textContent = out;
}

// =====================================================
// 마지막 동기화 시간 업데이트
// =====================================================
async function updateLastSyncTime() {
    try {
        const { data, error } = await supabase
            .from('sync_logs')
            .select('created_at')
            .eq('status', 'success')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (data) {
            const time = new Date(data.created_at).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('lastSyncTime').textContent = time;
        }
    } catch (error) {
        console.log('마지막 동기화 시간 조회 실패:', error);
    }
}

// =====================================================
// 재고 동기화 트리거
// =====================================================
async function triggerSync() {
    showLoadingOverlay();
    document.getElementById('loadingMessage').textContent = '재고 동기화 중... (배치 최적화)';
    document.getElementById('loadingSubtext').textContent = '약 10-30초 소요됩니다. 잠시만 기다려주세요!';
    
    try {
        showToast('재고 동기화를 시작합니다... (배치 최적화 버전)', 'info');
        
        const { data, error } = await supabase.functions.invoke('sync-inventory-simple', {
            body: { trigger: 'manual' }
        });
        
        if (error) throw error;
        
        console.log('✅ 재고 동기화 완료:', data);
        
        showToast(`✅ 재고 동기화 완료! ${data.data?.itemsSynced || 0}개 동기화`, 'success');
        
        // 데이터 새로고침
        await loadInventory();
        await loadSyncLogs();
        
    } catch (error) {
        console.error('❌ 재고 동기화 실패:', error);
        showToast(`❌ 재고 동기화 실패: ${error.message}`, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// =====================================================
// 동기화 로그 로드
// =====================================================
async function loadSyncLogs() {
    try {
        const { data, error } = await supabase
            .from('sync_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        logsData = data || [];
        renderLogsTable(logsData);
        
    } catch (error) {
        console.error('❌ 로그 로드 실패:', error);
    }
}

// =====================================================
// 로그 테이블 렌더링
// =====================================================
function renderLogsTable(data) {
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 1rem;">
                    동기화 기록이 없습니다
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(log => {
        const row = document.createElement('tr');
        
        // 상태 배지
        let statusClass = 'success';
        let statusText = '성공';
        if (log.status === 'error') {
            statusClass = 'danger';
            statusText = '실패';
        } else if (log.status === 'partial') {
            statusClass = 'warning';
            statusText = '부분성공';
        }
        
        // 유형 배지
        const typeText = log.sync_type === 'auto' ? '자동' : '수동';
        
        // 시간 포맷
        const time = new Date(log.created_at).toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 소요시간 포맷
        const duration = log.duration_ms 
            ? `${(log.duration_ms / 1000).toFixed(1)}초`
            : '-';
        
        row.innerHTML = `
            <td style="font-size: 0.875rem;">${time}</td>
            <td><span class="status-badge">${typeText}</span></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${log.items_synced || 0}</td>
            <td>${log.items_failed || 0}</td>
            <td>${duration}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// =====================================================
// 검색 및 필터링
// =====================================================
function filterInventory() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = inventoryData;
    
    // 상태 필터
    if (statusFilter !== 'all') {
        filtered = filtered.filter(item => item.stock_status === statusFilter);
    }
    
    // 검색어 필터
    if (searchTerm) {
        filtered = filtered.filter(item => 
            (item.sku?.toLowerCase().includes(searchTerm)) ||
            (item.product_name?.toLowerCase().includes(searchTerm))
        );
    }
    
    renderInventoryTable(filtered);
}

// =====================================================
// 실시간 구독
// =====================================================
function subscribeToRealtimeUpdates() {
    // inventory 테이블 변경 구독
    supabase
        .channel('inventory-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'inventory' },
            (payload) => {
                console.log('📡 실시간 업데이트:', payload);
                loadInventory();
            }
        )
        .subscribe();
    
    // sync_logs 테이블 변경 구독
    supabase
        .channel('logs-changes')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'sync_logs' },
            (payload) => {
                console.log('📋 새 로그:', payload);
                loadSyncLogs();
            }
        )
        .subscribe();
}

// =====================================================
// UI 상태 관리
// =====================================================
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('tableWrapper').style.display = 'none';
}

function showErrorState(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('tableWrapper').style.display = 'none';
    document.getElementById('errorMessage').textContent = message;
}

function showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('tableWrapper').style.display = 'none';
}

function showTableState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('tableWrapper').style.display = 'block';
}

function showLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// =====================================================
// 토스트 알림
// =====================================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// =====================================================
// 로그 토글
// =====================================================
function toggleLogs() {
    const content = document.getElementById('logsContent');
    const icon = document.getElementById('toggleIcon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

// =====================================================
// 탭 전환
// =====================================================
function switchTab(tabName) {
    console.log(`🔄 탭 전환: ${currentTab} → ${tabName}`);
    currentTab = tabName;
    
    // 탭 버튼 활성화 상태 변경
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 탭 컨텐츠 표시/숨김
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // 동기화 버튼 텍스트 변경
    const syncBtnText = document.getElementById('syncBtnText');
    if (tabName === 'inventory') {
        syncBtnText.textContent = '재고 동기화';
    } else {
        syncBtnText.textContent = '주문 동기화';
    }
    
    // 해당 탭 데이터 로드
    if (tabName === 'orders' && ordersData.length === 0) {
        loadOrders();
        loadOrderSyncLogs();
    }
}

// =====================================================
// 주문 데이터 로드
// =====================================================
async function loadOrders() {
    showOrdersLoadingState();
    
    try {
        // orders 테이블과 order_items 조인하여 조회
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .order('ord_time', { ascending: false })
            .limit(500);
        
        if (error) throw error;
        
        ordersData = data || [];
        
        if (ordersData.length === 0) {
            showOrdersEmptyState();
        } else {
            showOrdersTableState();
            renderOrdersTable(ordersData);
            updateOrderStatistics(ordersData);
            updateLastSyncTime();
        }
        
    } catch (error) {
        console.error('❌ 주문 데이터 로드 실패:', error);
        showOrdersErrorState(error.message);
    }
}

// =====================================================
// 주문 테이블 렌더링
// =====================================================
function renderOrdersTable(data) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 2rem; color: #6b7280;">
                    검색 결과가 없습니다
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(order => {
        // 주문에 여러 상품이 있을 수 있으므로 첫 번째 상품 정보만 표시
        const firstItem = order.order_items?.[0] || {};
        const itemCount = order.order_items?.length || 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="status-badge status-${getOrderStatusClass(order.ord_status)}">
                    ${order.ord_status}
                </span>
            </td>
            <td style="font-weight: 600;">${order.shop_ord_no || '-'}</td>
            <td>
                <span class="shop-badge">${order.shop_name || '-'}</span>
            </td>
            <td>${formatDateTime(order.ord_time)}</td>
            <td>${order.order_name || '-'}</td>
            <td>
                ${firstItem.product_name || order.shop_sale_name || '-'}
                ${itemCount > 1 ? `<span style="color: #6b7280; font-size: 0.875rem;"> 외 ${itemCount - 1}건</span>` : ''}
            </td>
            <td><code style="font-size: 0.875rem;">${firstItem.sku_cd || '-'}</code></td>
            <td style="text-align: center;">${order.sale_cnt || firstItem.sale_cnt || 0}</td>
            <td style="font-weight: 600;">${formatCurrency(order.sales || 0)}</td>
            <td>${order.carr_name || '-'}</td>
            <td><code style="font-size: 0.875rem;">${order.invoice_no || '-'}</code></td>
        `;
        
        tbody.appendChild(row);
    });
}

// =====================================================
// 주문 통계 업데이트
// =====================================================
function updateOrderStatistics(data) {
    const total = data.length;
    const shipping = data.filter(o => o.ord_status === '배송중').length;
    const newOrders = data.filter(o => o.ord_status === '신규주문').length;
    const completed = data.filter(o => o.ord_status === '배송완료').length;
    
    document.getElementById('totalOrders').textContent = total.toLocaleString();
    document.getElementById('shippingOrders').textContent = shipping.toLocaleString();
    document.getElementById('newOrders').textContent = newOrders.toLocaleString();
    document.getElementById('completedOrders').textContent = completed.toLocaleString();
}

// =====================================================
// 주문 필터링
// =====================================================
function filterOrders() {
    const searchTerm = document.getElementById('orderSearchInput').value.toLowerCase();
    const shopFilter = document.getElementById('shopFilter').value;
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const startDate = document.getElementById('startDateFilter').value;
    const endDate = document.getElementById('endDateFilter').value;
    
    let filtered = ordersData.filter(order => {
        // 검색어 필터
        const matchesSearch = !searchTerm || 
            order.shop_ord_no?.toLowerCase().includes(searchTerm) ||
            order.order_name?.toLowerCase().includes(searchTerm) ||
            order.to_name?.toLowerCase().includes(searchTerm);
        
        // 쇼핑몰 필터
        const matchesShop = shopFilter === 'all' || order.shop_cd === shopFilter;
        
        // 상태 필터
        const matchesStatus = statusFilter === 'all' || order.ord_status === statusFilter;
        
        // 날짜 필터
        let matchesDate = true;
        if (startDate && order.ord_time) {
            matchesDate = matchesDate && new Date(order.ord_time) >= new Date(startDate);
        }
        if (endDate && order.ord_time) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59);
            matchesDate = matchesDate && new Date(order.ord_time) <= endDateTime;
        }
        
        return matchesSearch && matchesShop && matchesStatus && matchesDate;
    });
    
    renderOrdersTable(filtered);
    updateOrderStatistics(filtered);
}

// =====================================================
// 주문 동기화 트리거
// =====================================================
async function triggerOrderSync() {
    showLoadingOverlay();
    document.getElementById('loadingMessage').textContent = '주문 동기화 중...';
    document.getElementById('loadingSubtext').textContent = '주문 데이터를 가져오는 중입니다. 잠시만 기다려주세요.';
    
    try {
        // 필터 값 읽기
        const startDate = document.getElementById('startDateFilter').value;
        const endDate = document.getElementById('endDateFilter').value;
        const shopCd = document.getElementById('shopFilter').value;
        const status = document.getElementById('orderStatusFilter').value;
        
        // 날짜 범위 계산 (daysAgo)
        let daysAgo = 7; // 기본값
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            daysAgo = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        } else if (startDate) {
            const start = new Date(startDate);
            const today = new Date();
            daysAgo = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1;
        }
        
        // API 요청 바디 구성
        const requestBody = {
            forceRefresh: true,
            daysAgo: Math.max(daysAgo, 1) // 최소 1일
        };
        
        // 쇼핑몰 필터 추가
        if (shopCd && shopCd !== 'all') {
            requestBody.shopCd = shopCd;
        }
        
        // 주문 상태 필터 추가
        if (status && status !== 'all') {
            requestBody.status = [status];
        }
        
        console.log('📦 주문 동기화 요청:', requestBody);
        
        showToast(`주문 동기화 시작... (최근 ${daysAgo}일${shopCd !== 'all' ? `, ${shopCd}` : ''}${status !== 'all' ? `, ${status}` : ''})`, 'info');
        
        const { data, error } = await supabase.functions.invoke('sync-orders', {
            body: requestBody
        });
        
        if (error) throw error;
        
        console.log('✅ 주문 동기화 완료:', data);
        
        showToast(`✅ 주문 동기화 완료! ${data.data?.ordersSynced || 0}개 주문 동기화`, 'success');
        
        // 데이터 새로고침
        await loadOrders();
        await loadOrderSyncLogs();
        
    } catch (error) {
        console.error('❌ 주문 동기화 실패:', error);
        showToast(`❌ 주문 동기화 실패: ${error.message}`, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// =====================================================
// 주문 동기화 로그 로드
// =====================================================
async function loadOrderSyncLogs() {
    try {
        const { data, error } = await supabase
            .from('order_sync_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        orderLogsData = data || [];
        renderOrderSyncLogs(orderLogsData);
        
    } catch (error) {
        console.error('❌ 주문 동기화 로그 로드 실패:', error);
    }
}

// =====================================================
// 주문 동기화 로그 렌더링
// =====================================================
function renderOrderSyncLogs(logs) {
    const tbody = document.getElementById('ordersLogsTableBody');
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 1rem; color: #6b7280;">
                    동기화 기록이 없습니다
                </td>
            </tr>
        `;
        return;
    }
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDateTime(log.created_at)}</td>
            <td>
                <span class="badge ${log.sync_type === 'manual' ? 'badge-primary' : 'badge-secondary'}">
                    ${log.sync_type === 'manual' ? '수동' : '자동'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${log.status}">
                    ${formatSyncStatus(log.status)}
                </span>
            </td>
            <td style="text-align: center; color: var(--success-color);">${log.orders_synced || 0}</td>
            <td style="text-align: center; color: var(--danger-color);">${log.orders_failed || 0}</td>
            <td>${log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}초` : '-'}</td>
            <td>
                <span class="badge ${log.source === 'cache' ? 'badge-info' : 'badge-success'}">
                    ${log.source === 'cache' ? '캐시' : 'API'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// =====================================================
// 주문 로그 토글
// =====================================================
function toggleOrdersLogs() {
    const content = document.getElementById('ordersLogsContent');
    const icon = document.getElementById('toggleOrdersIcon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

// =====================================================
// 주문 UI 상태 관리
// =====================================================
function showOrdersLoadingState() {
    document.getElementById('ordersLoadingState').style.display = 'block';
    document.getElementById('ordersErrorState').style.display = 'none';
    document.getElementById('ordersEmptyState').style.display = 'none';
    document.getElementById('ordersTableWrapper').style.display = 'none';
}

function showOrdersErrorState(message) {
    document.getElementById('ordersLoadingState').style.display = 'none';
    document.getElementById('ordersErrorState').style.display = 'block';
    document.getElementById('ordersEmptyState').style.display = 'none';
    document.getElementById('ordersTableWrapper').style.display = 'none';
    document.getElementById('ordersErrorMessage').textContent = message;
}

function showOrdersEmptyState() {
    document.getElementById('ordersLoadingState').style.display = 'none';
    document.getElementById('ordersErrorState').style.display = 'none';
    document.getElementById('ordersEmptyState').style.display = 'block';
    document.getElementById('ordersTableWrapper').style.display = 'none';
}

function showOrdersTableState() {
    document.getElementById('ordersLoadingState').style.display = 'none';
    document.getElementById('ordersErrorState').style.display = 'none';
    document.getElementById('ordersEmptyState').style.display = 'none';
    document.getElementById('ordersTableWrapper').style.display = 'block';
}

// =====================================================
// 유틸리티 함수
// =====================================================
function getOrderStatusClass(status) {
    const statusMap = {
        '신규주문': 'pending',
        '배송중': 'shipping',
        '배송완료': 'completed',
        '취소': 'cancelled'
    };
    return statusMap[status] || 'default';
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

console.log('✅ 관리 시스템 초기화 완료');


