/**
 * 썬데이허그 모바일 앱 브릿지 스크립트
 * 
 * 이 스크립트는 React Native WebView에서 웹앱이 열릴 때만 활성화됩니다.
 * 일반 웹 브라우저에서는 전혀 영향이 없습니다.
 * 
 * 사용법:
 * 1. 이 파일을 apps/customer/public/scripts/app-bridge.js로 복사
 * 2. apps/customer/app/root.tsx의 <head>에 <script src="/scripts/app-bridge.js" defer /> 추가
 */

(function() {
  'use strict';
  
  // React Native WebView 환경 체크
  if (typeof window === 'undefined' || !window.ReactNativeWebView) {
    // 웹 브라우저에서는 아무것도 하지 않음
    return;
  }
  
  console.log('[AppBridge] Initializing in React Native WebView...');
  
  // ===== 전역 플래그 =====
  window.isReactNativeApp = true;
  
  // ===== 네이티브로 메시지 전송 =====
  window.sendToNative = function(type, payload) {
    try {
      var message = JSON.stringify({ type: type, payload: payload || {} });
      window.ReactNativeWebView.postMessage(message);
      console.log('[AppBridge] Sent to native:', type, payload);
    } catch (error) {
      console.error('[AppBridge] Failed to send message:', error);
    }
  };
  
  // ===== 네이티브에서 메시지 수신 =====
  window.handleNativeMessage = function(message) {
    try {
      console.log('[AppBridge] Received from native:', message);
      
      // CustomEvent로 변환하여 전파
      var event = new CustomEvent('nativeMessage', {
        detail: message,
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(event);
      
      // 타입별 특수 처리
      if (message.type === 'CAMERA_RESULT' && typeof window.onCameraResult === 'function') {
        window.onCameraResult(message.payload);
      }
      
      if (message.type === 'AUTH_STATE') {
        // 인증 상태 변경 시 페이지 새로고침 또는 상태 업데이트
        if (message.payload.isLoggedIn === false) {
          // 로그아웃 처리
          window.location.href = '/customer/login';
        }
      }
      
      if (message.type === 'NAVIGATE_BACK') {
        window.history.back();
      }
    } catch (error) {
      console.error('[AppBridge] Failed to handle message:', error);
    }
  };
  
  // ===== 카메라 요청 헬퍼 =====
  window.requestNativeCamera = function(mode, callback) {
    mode = mode || 'photo';
    
    // 콜백 등록
    if (typeof callback === 'function') {
      window.onCameraResult = callback;
    }
    
    window.sendToNative('REQUEST_CAMERA', { mode: mode });
  };
  
  // ===== 푸시 알림 권한 요청 =====
  window.requestPushPermission = function() {
    window.sendToNative('REQUEST_PUSH_PERMISSION', {});
  };
  
  // ===== 외부 URL 열기 =====
  window.openExternalUrl = function(url) {
    window.sendToNative('OPEN_EXTERNAL_URL', { url: url });
  };
  
  // ===== 공유하기 =====
  window.shareContent = function(title, message, url) {
    window.sendToNative('SHARE', { title: title, message: message, url: url });
  };
  
  // ===== 탭 전환 =====
  window.setAppTab = function(tab) {
    if (['home', 'warranty', 'sleep', 'mypage'].indexOf(tab) !== -1) {
      window.sendToNative('SET_TAB', { tab: tab });
    }
  };
  
  // ===== 앱 네비게이션 =====
  window.navigateInApp = function(screen, params) {
    window.sendToNative('NAVIGATE', { screen: screen, params: params });
  };
  
  // ===== 스타일 적용 =====
  // 앱 내에서 열렸을 때 웹 헤더/탭바 숨김
  document.documentElement.classList.add('in-app');
  
  // 스타일 주입
  var style = document.createElement('style');
  style.textContent = [
    '/* 앱에서 열렸을 때 웹 UI 숨김 */',
    '.in-app header { display: none !important; }',
    '.in-app nav.fixed.bottom-0 { display: none !important; }',
    '.in-app .safe-area-bottom { padding-bottom: 0 !important; }',
    '.in-app main { padding-bottom: 0 !important; }',
    '.in-app footer { display: none !important; }',
  ].join('\n');
  document.head.appendChild(style);
  
  // ===== 링크 인터셉트 =====
  // 외부 링크는 네이티브 브라우저로 열기
  document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (!target) return;
    
    var href = target.getAttribute('href');
    if (!href) return;
    
    // 외부 링크 체크
    var isExternal = (
      href.startsWith('http') && 
      !href.includes('app.sundayhug.com') && 
      !href.includes('localhost')
    );
    
    // tel:, mailto: 링크
    var isSpecial = href.startsWith('tel:') || href.startsWith('mailto:');
    
    if (isExternal || isSpecial) {
      e.preventDefault();
      window.openExternalUrl(href);
    }
  }, true);
  
  // ===== 페이지 로드 완료 알림 =====
  if (document.readyState === 'complete') {
    notifyPageLoaded();
  } else {
    window.addEventListener('load', notifyPageLoaded);
  }
  
  function notifyPageLoaded() {
    window.sendToNative('PAGE_LOADED', { 
      url: window.location.href,
      title: document.title
    });
  }
  
  console.log('[AppBridge] Initialized successfully');
})();



