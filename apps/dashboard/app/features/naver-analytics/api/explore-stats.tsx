/**
 * 네이버 통계 API 탐색 엔드포인트
 * Phase 0: API 응답 스키마 파악용
 *
 * GET /api/naver-analytics/explore?channelNo=xxx
 * POST /api/naver-analytics/explore (body: { channelNo, startDate, endDate, apiName })
 */

import type { Route } from "./+types/explore-stats";
import {
  exploreAllApis,
  getChannelList,
  testChannelFormats,
  getCustomerStatusAccount,
  getCustomerStatusChannel,
  getRepurchaseStats,
  getMarketingAllDaily,
  getMarketingAllDetail,
  getMarketingSearchKeyword,
  getMarketingHourlySimple,
  getShoppingPageDetail,
  getShoppingProductDetail,
  getRealtimeDaily,
  getSalesProductDetail,
  getSalesHourlyDetail,
  getSalesDeliveryDetail,
} from "../lib/naver-stats.server";

// 기본 날짜 범위 (최근 7일)
function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

// GET: 단일 API 테스트 또는 전체 탐색
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const channelNo = url.searchParams.get("channelNo");
  const apiName = url.searchParams.get("api");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!channelNo) {
    return Response.json({
      error: "channelNo 파라미터가 필요합니다",
      usage: {
        single: "/api/naver-analytics/explore?channelNo=xxx&api=realtimeDaily",
        channels: "/api/naver-analytics/explore?channelNo=test&api=channelList",
        testFormats: "/api/naver-analytics/explore?channelNo=test&api=testChannelFormats",
        all: "/api/naver-analytics/explore?channelNo=xxx&api=all",
        withDates: "/api/naver-analytics/explore?channelNo=xxx&api=salesProductDetail&startDate=2026-01-01&endDate=2026-01-06",
      },
      availableApis: [
        "channelList",
        "testChannelFormats",
        "customerStatusAccount",
        "customerStatusChannel",
        "repurchaseStats",
        "marketingAllDaily",
        "marketingAllDetail",
        "marketingSearchKeyword",
        "marketingHourlySimple",
        "shoppingPageDetail",
        "shoppingProductDetail",
        "realtimeDaily",
        "salesProductDetail",
        "salesHourlyDetail",
        "salesDeliveryDetail",
        "all",
      ],
    }, { status: 400 });
  }

  const dates = {
    startDate: startDate || getDefaultDateRange().startDate,
    endDate: endDate || getDefaultDateRange().endDate,
  };

  // 전체 탐색
  if (apiName === "all") {
    const results = await exploreAllApis(channelNo, dates.startDate, dates.endDate);
    return Response.json({
      channelNo,
      dateRange: dates,
      results,
    });
  }

  // 단일 API 테스트
  let result: any;

  switch (apiName) {
    case "channelList":
      result = await getChannelList();
      break;
    case "testChannelFormats":
      result = await testChannelFormats();
      break;
    case "customerStatusAccount":
      result = await getCustomerStatusAccount(dates.startDate, dates.endDate);
      break;
    case "customerStatusChannel":
      result = await getCustomerStatusChannel(channelNo, dates.startDate, dates.endDate);
      break;
    case "repurchaseStats":
      result = await getRepurchaseStats(dates.startDate, dates.endDate);
      break;
    case "marketingAllDaily":
      result = await getMarketingAllDaily(channelNo, dates.startDate, dates.endDate);
      break;
    case "marketingAllDetail":
      result = await getMarketingAllDetail(channelNo, dates.startDate, dates.endDate);
      break;
    case "marketingSearchKeyword":
      result = await getMarketingSearchKeyword(channelNo, dates.startDate, dates.endDate);
      break;
    case "marketingHourlySimple":
      result = await getMarketingHourlySimple(channelNo, dates.startDate, dates.endDate);
      break;
    case "shoppingPageDetail":
      result = await getShoppingPageDetail(channelNo, dates.startDate, dates.endDate);
      break;
    case "shoppingProductDetail":
      result = await getShoppingProductDetail(channelNo, dates.startDate, dates.endDate);
      break;
    case "realtimeDaily":
      result = await getRealtimeDaily(channelNo);
      break;
    case "salesProductDetail":
      result = await getSalesProductDetail(channelNo, dates.startDate, dates.endDate);
      break;
    case "salesHourlyDetail":
      result = await getSalesHourlyDetail(channelNo, dates.startDate, dates.endDate);
      break;
    case "salesDeliveryDetail":
      result = await getSalesDeliveryDetail(channelNo, dates.startDate, dates.endDate);
      break;
    default:
      return Response.json({
        error: `알 수 없는 API: ${apiName}`,
        availableApis: [
          "channelList",
          "testChannelFormats",
          "customerStatusAccount",
          "customerStatusChannel",
          "repurchaseStats",
          "marketingAllDaily",
          "marketingAllDetail",
          "marketingSearchKeyword",
          "marketingHourlySimple",
          "shoppingPageDetail",
          "shoppingProductDetail",
          "realtimeDaily",
          "salesProductDetail",
          "salesHourlyDetail",
          "salesDeliveryDetail",
          "all",
        ],
      }, { status: 400 });
  }

  return Response.json({
    api: apiName,
    channelNo,
    dateRange: dates,
    result,
  });
}
