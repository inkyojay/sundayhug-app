/**
 * Placid API Service (Server-side)
 *
 * 카드뉴스 이미지 생성을 위한 Placid API 연동 모듈
 */

// ===== 템플릿 UUID 상수 =====
export const PLACID_TEMPLATES = {
  // 1번: 썸네일 (표지)
  THUMBNAIL: "n98pmokubncg8",
  // 2번: 엄마의 현실일기
  MOMS_DIARY: "lwq9uwrizrxht",
  // 3번: 이미지+핀+점수
  IMAGE_PIN_SCORE: "tifs0gpwsoynn",
  // 4번: Bad 피드백 + 추천제품
  BAD_FEEDBACK: "q1mdgdcdymxnz",
  // 5번: Good 피드백 + 양총평
  GOOD_FEEDBACK: "wl2vnbyjwl425",
  // 6번: CTA (고정 이미지)
  CTA_FIXED: null, // 고정 이미지 URL 사용
} as const;

// 6번 CTA 고정 이미지 URL (Placid에서 생성 후 고정)
export const CTA_IMAGE_URL = "https://sundayhug-storage.s3.ap-northeast-2.amazonaws.com/cardnews/cta-slide.png";

// ===== 타입 정의 =====
export interface PlacidImageResponse {
  id: number;
  status: "queued" | "finished" | "error";
  image_url?: string;
  polling_url?: string;
  error?: string;
}

export interface CardNewsData {
  // 1번: 썸네일
  name: string;           // 아기 이름
  photo1: string;         // 사용자 업로드 이미지 URL
  goal: string;           // 목표 한 문장
  
  // 2번: 엄마의 현실일기
  date: string;           // 분석 날짜 (YYYY.MM.DD)
  text122: string;        // 엄마 입장 일기 (122자)
  
  // 3번: 이미지+핀+점수
  imagePinUrl: string;    // 핀이 표시된 이미지 URL
  score: number;          // 안전 점수
  
  // 4번: Bad 피드백 + 추천제품
  badCardUrls: string[];  // Bad 카드 이미지 URL (최대 3개)
  products: {
    name: string;
    imageUrl: string;
  }[];
  
  // 5번: Good 피드백 + 양총평
  goodCardUrls: string[]; // Good 카드 이미지 URL (최대 3개)
  summary: string;        // 양 총평 (50자)
}

// ===== API 함수 =====

/**
 * Placid API 토큰 가져오기
 */
function getApiToken(): string {
  const token = process.env.PLACID_API_TOKEN;
  if (!token) {
    throw new Error("PLACID_API_TOKEN environment variable is not set");
  }
  return token;
}

/**
 * Placid API로 이미지 생성 요청
 */
async function createPlacidImage(
  templateUuid: string,
  layers: Record<string, { text?: string; image?: string }>
): Promise<PlacidImageResponse> {
  const token = getApiToken();
  
  const response = await fetch("https://api.placid.app/api/rest/images", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_uuid: templateUuid,
      layers,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Placid API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * 이미지 생성 완료까지 폴링
 */
async function pollForImage(
  imageId: number,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<string> {
  const token = getApiToken();
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.placid.app/api/rest/images/${imageId}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );
    
    const data: PlacidImageResponse = await response.json();
    
    if (data.status === "finished" && data.image_url) {
      return data.image_url;
    }
    
    if (data.status === "error") {
      throw new Error(`Placid image generation failed: ${data.error}`);
    }
    
    // 대기 후 재시도
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  
  throw new Error("Placid image generation timed out");
}

/**
 * 1번 슬라이드: 썸네일 생성
 */
export async function generateThumbnailSlide(
  name: string,
  photoUrl: string,
  goal: string
): Promise<string> {
  const result = await createPlacidImage(PLACID_TEMPLATES.THUMBNAIL, {
    name: { text: name },
    photo1: { image: photoUrl },
    goal: { text: goal },
  });
  
  return pollForImage(result.id);
}

/**
 * 2번 슬라이드: 엄마의 현실일기 생성
 */
export async function generateMomsDiarySlide(
  date: string,
  photoUrl: string,
  text122: string
): Promise<string> {
  const result = await createPlacidImage(PLACID_TEMPLATES.MOMS_DIARY, {
    date: { text: date },
    photo2: { image: photoUrl },
    text122: { text: text122 },
  });
  
  return pollForImage(result.id);
}

/**
 * 3번 슬라이드: 이미지+핀+점수 생성
 */
export async function generateImagePinSlide(
  imagePinUrl: string,
  name: string,
  score: number
): Promise<string> {
  const result = await createPlacidImage(PLACID_TEMPLATES.IMAGE_PIN_SCORE, {
    "image-pin": { image: imagePinUrl },
    name: { text: name },
    score: { text: String(score) },
  });
  
  return pollForImage(result.id);
}

/**
 * 4번 슬라이드: Bad 피드백 + 추천제품 생성
 */
export async function generateBadFeedbackSlide(
  badCardUrls: string[],
  products: { name: string; imageUrl: string }[]
): Promise<string> {
  const layers: Record<string, { text?: string; image?: string }> = {};
  
  // Bad 카드 이미지 (최대 3개)
  badCardUrls.slice(0, 3).forEach((url, i) => {
    layers[`bad_card_${i + 1}`] = { image: url };
  });
  
  // 추천 제품 (최대 3개)
  products.slice(0, 3).forEach((product, i) => {
    layers[`product_img_${i + 1}`] = { image: product.imageUrl };
    layers[`product_name_${i + 1}`] = { text: product.name };
  });
  
  const result = await createPlacidImage(PLACID_TEMPLATES.BAD_FEEDBACK, layers);
  
  return pollForImage(result.id);
}

/**
 * 5번 슬라이드: Good 피드백 + 양총평 생성
 */
export async function generateGoodFeedbackSlide(
  goodCardUrls: string[],
  summary: string
): Promise<string> {
  const layers: Record<string, { text?: string; image?: string }> = {};
  
  // Good 카드 이미지 (최대 3개)
  goodCardUrls.slice(0, 3).forEach((url, i) => {
    layers[`good_card_${i + 1}`] = { image: url };
  });
  
  // 양 총평
  layers.summary = { text: summary };
  
  const result = await createPlacidImage(PLACID_TEMPLATES.GOOD_FEEDBACK, layers);
  
  return pollForImage(result.id);
}

/**
 * 전체 카드뉴스 6장 생성
 */
export async function generateAllCardNewsSlides(
  data: CardNewsData
): Promise<string[]> {
  console.log("[Placid] Starting card news generation...");
  
  const slideUrls: string[] = [];
  
  try {
    // 1번: 썸네일
    console.log("[Placid] Generating slide 1: Thumbnail");
    const slide1 = await generateThumbnailSlide(data.name, data.photo1, data.goal);
    slideUrls.push(slide1);
    
    // 2번: 엄마의 현실일기
    console.log("[Placid] Generating slide 2: Mom's Diary");
    const slide2 = await generateMomsDiarySlide(data.date, data.photo1, data.text122);
    slideUrls.push(slide2);
    
    // 3번: 이미지+핀+점수
    console.log("[Placid] Generating slide 3: Image + Pin + Score");
    const slide3 = await generateImagePinSlide(data.imagePinUrl, data.name, data.score);
    slideUrls.push(slide3);
    
    // 4번: Bad 피드백 + 추천제품
    console.log("[Placid] Generating slide 4: Bad Feedback + Products");
    const slide4 = await generateBadFeedbackSlide(data.badCardUrls, data.products);
    slideUrls.push(slide4);
    
    // 5번: Good 피드백 + 양총평
    console.log("[Placid] Generating slide 5: Good Feedback + Summary");
    const slide5 = await generateGoodFeedbackSlide(data.goodCardUrls, data.summary);
    slideUrls.push(slide5);
    
    // 6번: CTA (고정 이미지)
    console.log("[Placid] Adding slide 6: CTA (fixed)");
    slideUrls.push(CTA_IMAGE_URL);
    
    console.log("[Placid] Card news generation complete!");
    return slideUrls;
    
  } catch (error) {
    console.error("[Placid] Error generating card news:", error);
    throw error;
  }
}

/**
 * 텍스트 글자 수 제한 (말줄임표 처리)
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * 날짜 포맷팅 (YYYY.MM.DD)
 */
export function formatDateForCardNews(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}









