/**
 * 커머스 API 프록시 서버 (네이버 + 쿠팡)
 * - Railway에 배포하여 고정 IP 사용
 * - 대시보드에서 이 프록시를 통해 네이버/쿠팡 API 호출
 */

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 환경변수에서 인증 정보 가져오기
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const NAVER_ACCOUNT_ID = process.env.NAVER_ACCOUNT_ID; // 스마트스토어 계정 ID
const PROXY_API_KEY = process.env.PROXY_API_KEY; // 프록시 보안용 키

// 쿠팡 API 설정
const COUPANG_BASE_URL = "https://api-gateway.coupang.com";

/**
 * 프록시 API 키 검증 미들웨어
 */
function verifyApiKey(req, res, next) {
  const apiKey = req.headers["x-proxy-api-key"];
  
  if (!PROXY_API_KEY) {
    // 개발 환경에서는 키 검증 건너뛰기
    return next();
  }
  
  if (apiKey !== PROXY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
}

/**
 * 네이버 API 서명 생성 (bcrypt 사용)
 * - password: client_id + "_" + timestamp
 * - salt: client_secret (bcrypt salt 형식)
 */
async function generateSignature(clientId, clientSecret, timestamp) {
  const password = `${clientId}_${timestamp}`;
  // bcrypt hashSync 사용 (client_secret이 bcrypt salt 형식)
  const hash = bcrypt.hashSync(password, clientSecret);
  // Base64 인코딩
  const signature = Buffer.from(hash).toString("base64");
  return signature;
}

/**
 * 쿠팡 API HMAC-SHA256 서명 생성
 */
function generateCoupangSignature(method, path, timestamp, secretKey) {
  const message = `${timestamp}${method}${path}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("hex");
}

/**
 * 쿠팡 API 인증 헤더 생성
 */
function getCoupangAuthHeaders(method, path, accessKey, secretKey) {
  const timestamp = new Date().toISOString();
  const signature = generateCoupangSignature(method, path, timestamp, secretKey);
  return {
    "Content-Type": "application/json",
    "Authorization": `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${timestamp}, signature=${signature}`,
  };
}

/**
 * 헬스체크
 */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "commerce-proxy (naver + coupang)",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * 실제 외부 IP 확인
 */
app.get("/my-ip", async (req, res) => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    res.json({
      outbound_ip: data.ip,
      message: "이 IP를 네이버/쿠팡 API 센터에 등록하세요!",
      railway_static_ip: "208.77.246.15"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 토큰 발급 API
 * POST /api/token
 */
app.post("/api/token", verifyApiKey, async (req, res) => {
  try {
    const { client_id, client_secret, account_id } = req.body;
    
    const clientId = client_id || NAVER_CLIENT_ID;
    const clientSecret = client_secret || NAVER_CLIENT_SECRET;
    const accountId = account_id || NAVER_ACCOUNT_ID;
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({ 
        error: "client_id와 client_secret이 필요합니다" 
      });
    }
    
    if (!accountId) {
      return res.status(400).json({ 
        error: "account_id가 필요합니다 (환경변수 NAVER_ACCOUNT_ID 설정 필요)" 
      });
    }
    
    const timestamp = Date.now();
    const signature = await generateSignature(clientId, clientSecret, timestamp);
    
    console.log(`[토큰 발급] client_id: ${clientId}, account_id: ${accountId}, timestamp: ${timestamp}`);
    console.log(`[토큰 발급] signature 생성 완료`);
    
    const tokenUrl = "https://api.commerce.naver.com/external/v1/oauth2/token";
    
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("timestamp", timestamp.toString());
    params.append("client_secret_sign", signature);
    params.append("grant_type", "client_credentials");
    params.append("type", "SELF");
    params.append("account_id", accountId);
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[토큰 발급 실패] ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`[토큰 발급 성공]`);
    res.json(data);
    
  } catch (error) {
    console.error("[토큰 발급 에러]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 주문 조회 API (프록시)
 * GET /api/orders
 * 문서: https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-product-orders-with-conditions-pay-order-seller
 */
app.get("/api/orders", verifyApiKey, async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.replace("Bearer ", "");
    
    if (!accessToken) {
      return res.status(401).json({ error: "Access token required" });
    }
    
    // 쿼리 파라미터 전달
    const queryString = new URLSearchParams(req.query).toString();
    // 올바른 엔드포인트: /external/v1/pay-order/seller/product-orders
    const url = `https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders?${queryString}`;
    
    console.log(`[주문 조회] URL: ${url}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    
    const responseText = await response.text();
    console.log(`[주문 조회] 응답 status: ${response.status}`);
    console.log(`[주문 조회] 응답 body (처음 500자): ${responseText.slice(0, 500)}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[주문 조회 JSON 파싱 실패] 원본: ${responseText.slice(0, 1000)}`);
      return res.status(response.status || 500).json({ 
        error: "JSON 파싱 실패",
        rawResponse: responseText.slice(0, 500)
      });
    }
    
    if (!response.ok) {
      console.error(`[주문 조회 실패] ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`[주문 조회 성공] ${data.data?.length || 0}건`);
    res.json(data);
    
  } catch (error) {
    console.error("[주문 조회 에러]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 상품 조회 API (프록시)
 * GET /api/products
 */
app.get("/api/products", verifyApiKey, async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.replace("Bearer ", "");
    
    if (!accessToken) {
      return res.status(401).json({ error: "Access token required" });
    }
    
    // 쿼리 파라미터 전달
    const queryString = new URLSearchParams(req.query).toString();
    const url = `https://api.commerce.naver.com/external/v1/products?${queryString}`;
    
    console.log(`[상품 조회] URL: ${url}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[상품 조회 실패] ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`[상품 조회 성공] ${data.contents?.length || 0}건`);
    res.json(data);
    
  } catch (error) {
    console.error("[상품 조회 에러]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 범용 프록시 API
 * POST /api/proxy
 * body: { method, path, headers, body }
 */
app.post("/api/proxy", verifyApiKey, async (req, res) => {
  try {
    const { method = "GET", path, headers = {}, body } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: "path is required" });
    }
    
    const url = `https://api.commerce.naver.com${path}`;
    
    console.log(`[프록시] ${method} ${url}`);
    console.log(`[프록시] headers:`, JSON.stringify(headers));
    
    const fetchOptions = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };
    
    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();
    
    console.log(`[프록시] 응답 status: ${response.status}`);
    console.log(`[프록시] 응답 contentType: ${response.headers.get('content-type')}`);
    console.log(`[프록시] 응답 body (처음 500자): ${responseText.slice(0, 500)}`);
    
    // JSON 파싱 시도
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // JSON 파싱 실패 - HTML 또는 다른 형식
      console.error(`[프록시 JSON 파싱 실패] 원본 응답: ${responseText.slice(0, 1000)}`);
      return res.status(response.status || 500).json({ 
        error: "네이버 API가 JSON이 아닌 응답을 반환했습니다",
        status: response.status,
        contentType: response.headers.get('content-type'),
        rawResponse: responseText.slice(0, 500)
      });
    }
    
    if (!response.ok) {
      console.error(`[프록시 실패] ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`[프록시 성공]`);
    res.json(data);
    
  } catch (error) {
    console.error("[프록시 에러]", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// 쿠팡 로켓그로스 API 프록시
// =====================================================

/**
 * 쿠팡 범용 프록시 API
 * POST /api/coupang/proxy
 * body: { method, path, accessKey, secretKey, body? }
 */
app.post("/api/coupang/proxy", verifyApiKey, async (req, res) => {
  try {
    const { method = "GET", path, accessKey, secretKey, body } = req.body;

    if (!path) {
      return res.status(400).json({ error: "path is required" });
    }

    if (!accessKey || !secretKey) {
      return res.status(400).json({ error: "accessKey and secretKey are required" });
    }

    const url = `${COUPANG_BASE_URL}${path}`;
    const headers = getCoupangAuthHeaders(method, path, accessKey, secretKey);

    console.log(`[쿠팡 프록시] ${method} ${url}`);

    const fetchOptions = {
      method,
      headers,
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();

    console.log(`[쿠팡 프록시] 응답 status: ${response.status}`);
    console.log(`[쿠팡 프록시] 응답 body (처음 500자): ${responseText.slice(0, 500)}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[쿠팡 프록시 JSON 파싱 실패] 원본: ${responseText.slice(0, 1000)}`);
      return res.status(response.status || 500).json({
        error: "쿠팡 API가 JSON이 아닌 응답을 반환했습니다",
        status: response.status,
        rawResponse: responseText.slice(0, 500)
      });
    }

    if (!response.ok) {
      console.error(`[쿠팡 프록시 실패] ${response.status}`, data);
      return res.status(response.status).json(data);
    }

    console.log(`[쿠팡 프록시 성공]`);
    res.json(data);

  } catch (error) {
    console.error("[쿠팡 프록시 에러]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 쿠팡 주문 조회 API
 * GET /api/coupang/orders
 * query: vendorId, createdAtFrom, createdAtTo, status
 * headers: x-coupang-access-key, x-coupang-secret-key
 */
app.get("/api/coupang/orders", verifyApiKey, async (req, res) => {
  try {
    const accessKey = req.headers["x-coupang-access-key"];
    const secretKey = req.headers["x-coupang-secret-key"];

    if (!accessKey || !secretKey) {
      return res.status(401).json({ error: "Coupang access key and secret key required" });
    }

    const { vendorId, createdAtFrom, createdAtTo, status, maxPerPage = 50, nextToken } = req.query;

    if (!vendorId) {
      return res.status(400).json({ error: "vendorId is required" });
    }

    // 쿠팡 주문 조회 API 경로
    let path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets`;
    const params = new URLSearchParams();
    if (createdAtFrom) params.append("createdAtFrom", createdAtFrom);
    if (createdAtTo) params.append("createdAtTo", createdAtTo);
    if (status) params.append("status", status);
    params.append("maxPerPage", maxPerPage);
    if (nextToken) params.append("nextToken", nextToken);

    const queryString = params.toString();
    if (queryString) path += `?${queryString}`;

    const url = `${COUPANG_BASE_URL}${path}`;
    const headers = getCoupangAuthHeaders("GET", path.split("?")[0], accessKey, secretKey);

    console.log(`[쿠팡 주문 조회] ${url}`);

    const response = await fetch(url, { method: "GET", headers });
    const data = await response.json();

    if (!response.ok) {
      console.error(`[쿠팡 주문 조회 실패] ${response.status}`, data);
      return res.status(response.status).json(data);
    }

    console.log(`[쿠팡 주문 조회 성공] ${data.data?.length || 0}건`);
    res.json(data);

  } catch (error) {
    console.error("[쿠팡 주문 조회 에러]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 쿠팡 상품 조회 API
 * GET /api/coupang/products
 * query: vendorId, nextToken, maxPerPage, status
 * headers: x-coupang-access-key, x-coupang-secret-key
 */
app.get("/api/coupang/products", verifyApiKey, async (req, res) => {
  try {
    const accessKey = req.headers["x-coupang-access-key"];
    const secretKey = req.headers["x-coupang-secret-key"];

    if (!accessKey || !secretKey) {
      return res.status(401).json({ error: "Coupang access key and secret key required" });
    }

    const { vendorId, nextToken, maxPerPage = 100, status } = req.query;

    if (!vendorId) {
      return res.status(400).json({ error: "vendorId is required" });
    }

    // 쿠팡 상품 조회 API (로켓그로스)
    let path = `/v2/providers/seller_api/apis/api/v1/vendors/${vendorId}/products`;
    const params = new URLSearchParams();
    params.append("maxPerPage", maxPerPage);
    params.append("businessTypes", "rocketGrowth"); // 로켓그로스 전용
    if (nextToken) params.append("nextToken", nextToken);
    if (status) params.append("status", status);

    const queryString = params.toString();
    if (queryString) path += `?${queryString}`;

    const url = `${COUPANG_BASE_URL}${path}`;
    const headers = getCoupangAuthHeaders("GET", path.split("?")[0], accessKey, secretKey);

    console.log(`[쿠팡 상품 조회] ${url}`);

    const response = await fetch(url, { method: "GET", headers });
    const data = await response.json();

    if (!response.ok) {
      console.error(`[쿠팡 상품 조회 실패] ${response.status}`, data);
      return res.status(response.status).json(data);
    }

    console.log(`[쿠팡 상품 조회 성공] ${data.data?.length || 0}건`);
    res.json(data);

  } catch (error) {
    console.error("[쿠팡 상품 조회 에러]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 쿠팡 재고 조회 API
 * GET /api/coupang/inventory
 * query: vendorId, vendorItemIds (comma separated)
 * headers: x-coupang-access-key, x-coupang-secret-key
 */
app.get("/api/coupang/inventory", verifyApiKey, async (req, res) => {
  try {
    const accessKey = req.headers["x-coupang-access-key"];
    const secretKey = req.headers["x-coupang-secret-key"];

    if (!accessKey || !secretKey) {
      return res.status(401).json({ error: "Coupang access key and secret key required" });
    }

    const { vendorId, vendorItemIds } = req.query;

    if (!vendorId || !vendorItemIds) {
      return res.status(400).json({ error: "vendorId and vendorItemIds are required" });
    }

    // 쿠팡 재고 조회 API
    const path = `/v2/providers/fms_api/apis/api/v2/vendors/${vendorId}/inventories`;
    const url = `${COUPANG_BASE_URL}${path}?vendorItemIds=${vendorItemIds}`;
    const headers = getCoupangAuthHeaders("GET", path, accessKey, secretKey);

    console.log(`[쿠팡 재고 조회] ${url}`);

    const response = await fetch(url, { method: "GET", headers });
    const data = await response.json();

    if (!response.ok) {
      console.error(`[쿠팡 재고 조회 실패] ${response.status}`, data);
      return res.status(response.status).json(data);
    }

    console.log(`[쿠팡 재고 조회 성공]`);
    res.json(data);

  } catch (error) {
    console.error("[쿠팡 재고 조회 에러]", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 커머스 API 프록시 서버 시작 (v2.0-naver-coupang): http://0.0.0.0:${PORT}`);
  console.log(`📌 환경변수 설정 상태:`);
  console.log(`   - NAVER_CLIENT_ID: ${NAVER_CLIENT_ID ? "✅ 설정됨" : "❌ 미설정"}`);
  console.log(`   - NAVER_CLIENT_SECRET: ${NAVER_CLIENT_SECRET ? "✅ 설정됨" : "❌ 미설정"}`);
  console.log(`   - NAVER_ACCOUNT_ID: ${NAVER_ACCOUNT_ID ? "✅ 설정됨 (" + NAVER_ACCOUNT_ID + ")" : "❌ 미설정"}`);
  console.log(`   - PROXY_API_KEY: ${PROXY_API_KEY ? "✅ 설정됨" : "⚠️ 미설정 (개발 모드)"}`);
  console.log(`📌 지원 API:`);
  console.log(`   - 네이버: /api/token, /api/orders, /api/products, /api/proxy`);
  console.log(`   - 쿠팡: /api/coupang/proxy, /api/coupang/orders, /api/coupang/products, /api/coupang/inventory`);
});

