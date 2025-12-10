/**
 * Gemini API Service (Server-side)
 *
 * This module provides the AI analysis functionality using Google's Gemini API.
 * It analyzes baby sleep environment images and returns safety feedback.
 */
import { GoogleGenAI, Type } from "@google/genai";

import type { AnalysisReport, RiskLevel } from "../schema";
import { getRelevantReferences } from "./rag.server";
import { calculateAgeInMonths, parseDataUrl } from "./utils";

// Re-export utilities for convenience
export { calculateAgeInMonths, parseDataUrl };

/**
 * Convert base64 image to Gemini-compatible format
 */
function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}


/**
 * Get age group and specific guidelines based on months
 */
function getAgeGroupInfo(ageInMonths: number): {
  ageGroup: string;
  ageGroupKorean: string;
  specificRisks: string;
  developmentStage: string;
  actionGuidelines: string;
} {
  if (ageInMonths <= 3) {
    return {
      ageGroup: "0-3months",
      ageGroupKorean: "신생아~3개월",
      specificRisks: `
**이 월령의 핵심 위험 요소 (SIDS 최고 위험기):**
- 🚨 영아돌연사증후군(SIDS) 발생률이 가장 높은 시기입니다
- 아기가 스스로 고개를 들거나 뒤집을 수 없어 질식 위험이 매우 높습니다
- 체온 조절 능력이 미숙하여 과열에 취약합니다
- 목 근육이 약해 부드러운 표면에서 기도가 막힐 수 있습니다`,
      developmentStage: "아직 고개를 가누지 못하고, 뒤집기를 할 수 없는 시기",
      actionGuidelines: `
**구체적 행동 지침:**
- 베개 발견 시: "베개를 아기 침대에서 완전히 제거하고, 다른 방 옷장 높은 선반에 보관하세요"
- 이불/담요 발견 시: "담요 대신 슬립색(수면조끼)을 사용하세요. TOG 0.5-1.0 두께를 권장합니다"
- 부드러운 매트리스 발견 시: "손으로 눌렀을 때 바로 원상복귀되는 단단한 매트리스로 교체하세요"
- 침대 범퍼 발견 시: "범퍼를 즉시 제거하세요. 통기성 메쉬 범퍼도 권장하지 않습니다"
- 엎드려 자는 자세 발견 시: "아기를 즉시 등을 대고 눕히세요. 매 수면 시 반드시 등 자세로 재우세요"`,
    };
  } else if (ageInMonths <= 6) {
    return {
      ageGroup: "4-6months",
      ageGroupKorean: "4~6개월",
      specificRisks: `
**이 월령의 핵심 위험 요소 (뒤집기 시작 시기):**
- 🔄 뒤집기를 시작하는 시기로, 갑자기 엎드려 질 수 있습니다
- 아직 엎드린 상태에서 스스로 뒤집지 못할 수 있어 질식 위험이 있습니다
- 손으로 물건을 잡기 시작해 위험한 물건을 당길 수 있습니다
- 입에 물건을 넣기 시작하는 시기입니다`,
      developmentStage: "뒤집기를 시작하고, 물건을 잡을 수 있는 시기",
      actionGuidelines: `
**구체적 행동 지침:**
- 베개/인형 발견 시: "침대 안의 모든 부드러운 물건을 제거하세요. 아기가 뒤집었을 때 얼굴이 막힐 수 있습니다"
- 뒤집어 자는 자세 발견 시: "등을 대고 재우되, 아기가 스스로 뒤집으면 그대로 두어도 됩니다. 단, 침대 안은 비어있어야 합니다"
- 침대 주변 물건 발견 시: "아기 손이 닿는 거리(약 50cm) 내 모든 물건을 치우세요"
- 전선/코드 발견 시: "모든 전선을 벽면에 고정하거나 케이블 커버로 감싸세요"`,
    };
  } else if (ageInMonths <= 12) {
    return {
      ageGroup: "7-12months",
      ageGroupKorean: "7~12개월",
      specificRisks: `
**이 월령의 핵심 위험 요소 (기어다니기/서기 시기):**
- 🧗 기어다니고 잡고 서기를 시작해 침대에서 떨어질 위험이 있습니다
- 물건을 당기거나 올라타려고 할 수 있습니다
- 작은 물건을 집어 입에 넣을 수 있어 질식 위험이 있습니다
- 침대 난간을 넘으려고 시도할 수 있습니다`,
      developmentStage: "기어다니고, 잡고 서고, 가구를 잡고 이동하는 시기",
      actionGuidelines: `
**구체적 행동 지침:**
- 침대 높이 문제 발견 시: "매트리스를 가장 낮은 위치로 조절하세요. 아기 가슴 높이가 난간보다 낮아야 합니다"
- 침대 주변 가구 발견 시: "침대에서 최소 1m 거리에 모든 가구를 배치하세요"
- 작은 물건 발견 시: "지름 3.5cm 미만의 모든 물건을 제거하세요 (휴지통 테스트: 휴지 심에 들어가면 위험)"
- 모빌/장난감 발견 시: "아기가 손을 뻗어 닿을 수 있으면 즉시 제거하세요"`,
    };
  } else {
    return {
      ageGroup: "13-24months",
      ageGroupKorean: "13~24개월",
      specificRisks: `
**이 월령의 핵심 위험 요소 (걷기/활동적 시기):**
- 🏃 걷고 뛰기 시작해 침대 탈출을 시도할 수 있습니다
- 가구를 오르내리며 낙상 위험이 높습니다
- 문을 열고 나가려고 할 수 있습니다
- 서랍을 열어 위험한 물건에 접근할 수 있습니다`,
      developmentStage: "걷고, 뛰고, 오르내리고, 탐험하는 시기",
      actionGuidelines: `
**구체적 행동 지침:**
- 높은 침대 발견 시: "유아용 침대로 전환하거나, 매트리스를 바닥에 직접 놓는 것을 고려하세요"
- 침대 탈출 시도 가능 시: "침대 난간 높이가 아기 가슴 아래라면 유아 침대로 전환할 시기입니다"
- 서랍/문 발견 시: "모든 서랍과 문에 안전 잠금장치를 설치하세요"
- 가구 고정 필요 시: "모든 키 큰 가구(서랍장, 책장)를 벽에 고정하세요. 지진 방지용 브래킷을 사용하세요"`,
    };
  }
}

/**
 * Analyze sleep environment image using Gemini AI
 *
 * @param imageBase64 - Base64 encoded image data
 * @param imageMimeType - MIME type of the image (e.g., "image/jpeg")
 * @param birthDate - Baby's birth date (YYYY-MM-DD format)
 * @returns Analysis report with feedback items and references
 */
export async function analyzeSleepEnvironment(
  imageBase64: string,
  imageMimeType: string,
  birthDate: string
): Promise<AnalysisReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const ageInMonths = calculateAgeInMonths(birthDate);
  const ageInfo = getAgeGroupInfo(ageInMonths);

  // RAG: 관련 참고자료 가져오기
  let ragReferences = "";
  try {
    const references = await getRelevantReferences(ageInfo.ageGroup, [
      "sleep_surface",
      "bedding",
      "sleep_position",
      "environment",
    ]);
    if (references.length > 0) {
      ragReferences = `
**사전 검증된 참고 자료 (반드시 이 자료들을 우선 사용하세요):**
${references.map((ref) => `- ${ref.title}: ${ref.url} (출처: ${ref.source})`).join("\n")}
`;
    }
  } catch (error) {
    console.log("RAG references not available, using fallback");
  }

  const prompt = `당신은 신생아 및 24개월 미만 영유아를 위한 세계 최고 수준의 소아 수면 안전 전문가입니다.
제공된 아기 수면 환경 이미지를 매우 철저하고 상세하게 분석해 주세요.

## ⚠️ 중요: 이미지 유효성 검증
**먼저 이미지가 아기 수면 환경 분석에 적합한지 확인하세요.**

다음과 같은 경우 분석을 거부하고, analysisRejected: true를 반환하세요:
- 아기 침대, 요람, 수면 공간이 보이지 않는 경우
- 수면과 관련 없는 사진 (음식, 풍경, 물건, 문서, 스크린샷 등)
- 이미지가 너무 어둡거나 흐려서 수면 환경을 식별할 수 없는 경우
- 아기 방/수면 공간이 아닌 다른 장소의 사진

적합한 사진의 예시:
- 아기 침대/요람/바운서의 전체 또는 일부가 보이는 사진
- 아기가 자고 있는 모습이 담긴 사진
- 수면 환경(매트리스, 이불, 베개 등)이 보이는 사진

## 아기 정보
- **월령**: 생후 약 ${ageInMonths}개월 (${ageInfo.ageGroupKorean})
- **발달 단계**: ${ageInfo.developmentStage}

${ageInfo.specificRisks}

## 당신의 임무
1. 이미지를 픽셀 단위로 꼼꼼히 검토하여 모든 잠재적 위험 요소를 식별하세요.
2. **이 아기의 월령(${ageInMonths}개월)에 맞는** 위험도를 평가하세요.
3. 각 위험 요소의 정확한 위치를 찾아 좌표로 표시하세요.
4. **구체적이고 실행 가능한 행동 지침**을 제공하세요.

${ageInfo.actionGuidelines}

## 분석해야 할 핵심 영역

### 1. 수면 공간 (Sleeping Surface) - SIDS 예방의 핵심
- 매트리스가 충분히 단단한가? (손바닥으로 눌렀을 때 즉시 원상복귀 되어야 함)
- 매트리스와 침대 프레임 사이에 손가락 2개 이상 들어가는 틈이 있는가?
- 침대와 벽 사이에 아기가 끼일 수 있는 공간이 있는가?
- 시트가 팽팽하게 고정되어 있는가?

### 2. 침구 및 부드러운 물건 (질식 위험)
- 베개가 있는가? → **24개월 미만 절대 금지**
- 이불, 담요가 있는가? → **슬립색 대체 필요**
- 범퍼 가드가 있는가? → **즉시 제거 필요**
- 봉제 인형, 장난감이 있는가?
- 포지셔너, 쐐기형 베개가 있는가?

### 3. 수면 자세 (Sleep Position)
- 등을 대고 자고 있는가? (Back to Sleep)
- 옆으로 누워 있는가? → ${ageInMonths <= 6 ? "**위험: 즉시 교정 필요**" : "**주의 필요**"}
- 엎드려 있는가? → ${ageInMonths <= 4 ? "**매우 위험**" : ageInMonths <= 6 ? "**스스로 뒤집은 것이면 OK, 아니면 위험**" : "**스스로 뒤집은 것이면 OK**"}

### 4. 주변 환경 (월령별 위험도 다름)
- 전선, 코드가 50cm 이내에 있는가?
- 작은 물건(질식 위험)이 있는가? → ${ageInMonths >= 4 ? "**특히 주의**" : "해당 없음"}
- 침대에서 떨어질 수 있는 물건이 있는가?
- 창문 블라인드 코드가 있는가?

### 5. 침대 안전성 (월령별)
${ageInMonths <= 6 ? "- 바시넷/크래들 사용 시 무게 제한 확인 필요" : ""}
${ageInMonths >= 7 ? "- 매트리스 높이가 가장 낮은 위치인가?" : ""}
${ageInMonths >= 12 ? "- 침대 탈출 위험이 있는가? 난간 높이 확인" : ""}

### 6. 아기 상태
- 옷을 너무 많이 입었는가? (과열은 SIDS 위험 요소)
- 머리를 덮는 것이 있는가?
${ageInMonths <= 3 ? "- 모로 반사로 깨는 것을 방지하는 스와들링이 올바르게 되어 있는가?" : ""}

${ragReferences}

## 출력 형식 지침

**⚠️ 글자 수 제한 (카드뉴스용 - 반드시 지켜주세요!):**
- title (항목 제목): 8자 이내 (예: "누빔패드", "베개 발견")
- feedback (항목 설명): 40자 이내, 3줄로 나눠서 작성 (줄당 약 13자)
- summary (총평): 60자 이내
- scoreComment: 20자 이내

**좌표 시스템:**
- 이미지 왼쪽 상단이 (x:0, y:0), 오른쪽 하단이 (x:100, y:100)
- 각 위험 요소의 중심점을 좌표로 표시

**위험도 기준 (riskLevel):**
- "High": 즉각적인 조치가 필요한 심각한 위험 (SIDS 직접 관련, 질식 위험 등)
- "Medium": 가능한 빨리 개선이 필요한 위험
- "Low": 권장 사항 수준의 개선점
- "Info": 참고 정보 또는 칭찬할 점

**피드백 작성 규칙:**
1. 무엇이 문제인지 명확히
2. 왜 위험한지 설명 (이 월령에서 특히 왜 위험한지)
3. **구체적인 해결 방법** (어디서 구매, 어떻게 설치, 어떤 제품 추천 등)

**riskLevel 값은 반드시 다음 중 하나여야 합니다**: "High", "Medium", "Low", "Info" (정확히 이 영문 단어만 사용)

**momsDiary (엄마의 현실일기) 작성:**
- 아기를 키우는 엄마 입장에서 오늘의 감정/고민을 일기 형식으로 작성
- 총 6줄, 각 줄은 15자 이내
- 줄바꿈은 \\n으로 구분
- 예시:
  "오늘은 뭔가 이상했다\\n평소에 옆잠베개 해주면\\n잘 자던 우리 00이..\\n하루종일 칭얼거려서\\n안아주고 그래도 봤지만\\n방법을 모르겠다..ㅠㅠ"
- 분석 결과를 바탕으로 엄마의 걱정과 고민을 자연스럽게 표현

**summary 작성:**
- 60자 이내의 짧은 총평
- 양 캐릭터가 말풍선으로 전달하는 느낌
- 예시: "전반적으로 아기 수면환경은 아주해요! 17개월 된 아기는 활동량이 많아질 수 있어 침대 주변 정리하는 등 몇가지 개선만 하면 더욱 안전한 환경이 될 수 있어요!"

**참고 자료 (References):**
- 반드시 실제로 존재하는 공식 URL만 사용
- AAP, CDC, WHO, 한국소아과학회 등 공신력 있는 기관
- 최소 3개 이상 포함

**안전 점수 (safetyScore) 계산:**
- 100점 만점으로 수면 환경의 안전도를 평가
- High 위험 요소: 각 -20점
- Medium 위험 요소: 각 -10점  
- Low 위험 요소: 각 -5점
- Info (칭찬): 각 +2점 (최대 100점)
- 최저 0점, 최고 100점으로 제한

**점수 등급:**
- 90-100: 매우 안전 (⭐⭐⭐⭐⭐)
- 75-89: 안전 (⭐⭐⭐⭐)
- 60-74: 보통 (⭐⭐⭐)
- 40-59: 주의 필요 (⭐⭐)
- 0-39: 위험 (⭐)

**scoreComment:**
- 점수에 맞는 한 줄 코멘트 (예: "안전한 수면 환경이에요!", "몇 가지 개선이 필요해요")

**최종 결과물:**
- 단일 원시 JSON 객체
- 마크다운 서식 없이 순수 JSON만 출력
- 모든 텍스트는 한국어, riskLevel만 영문
- safetyScore는 정수로 반환

**분석 불가 시:**
- analysisRejected: true
- rejectionReason: 분석을 거부하는 이유 설명 (예: "이 이미지는 아기 수면 환경이 아닌 배송 조회 화면입니다. 아기 침대나 수면 공간이 보이는 사진을 올려주세요.")
- summary, feedbackItems, references, safetyScore, scoreComment는 빈/기본 값으로 반환
`;

  const imagePart = fileToGenerativePart(imageBase64, imageMimeType);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysisRejected: { type: Type.BOOLEAN },
            rejectionReason: { type: Type.STRING },
            safetyScore: { type: Type.NUMBER },
            scoreComment: { type: Type.STRING },
            summary: { type: Type.STRING },
            momsDiary: { type: Type.STRING },
            feedbackItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  feedback: { type: Type.STRING },
                  riskLevel: { type: Type.STRING },
                },
              },
            },
            references: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  uri: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    let jsonText = (response.text ?? "").trim();

    // Clean up potential markdown fences
    const startIndex = jsonText.indexOf("{");
    const endIndex = jsonText.lastIndexOf("}");
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonText = jsonText.substring(startIndex, endIndex + 1);
    }

    const parsedResult = JSON.parse(jsonText) as AnalysisReport & { 
      analysisRejected?: boolean; 
      rejectionReason?: string;
    };

    // 분석 불가 이미지 처리
    if (parsedResult.analysisRejected) {
      throw new Error(
        parsedResult.rejectionReason || 
        "이 이미지는 아기 수면 환경 분석에 적합하지 않습니다. 아기 침대나 수면 공간이 보이는 사진을 올려주세요."
      );
    }

    // Ensure references exist
    if (!parsedResult.references || parsedResult.references.length === 0) {
      parsedResult.references = [
        {
          title: "미국소아과학회(AAP) 안전 수면 가이드라인",
          uri: "https://www.aap.org/en/patient-care/safe-sleep/",
        },
        {
          title: "CDC 영아돌연사증후군(SIDS) 예방",
          uri: "https://www.cdc.gov/sids/about/index.html",
        },
        {
          title: "한국소아과학회",
          uri: "https://www.pediatrics.or.kr/",
        },
      ];
    }

    // Validate and normalize risk levels
    parsedResult.feedbackItems = parsedResult.feedbackItems.map((item) => ({
      ...item,
      riskLevel: validateRiskLevel(item.riskLevel),
    }));

    return parsedResult;
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);

    if (error instanceof SyntaxError) {
      throw new Error(
        "AI가 예상치 못한 형식으로 응답했습니다. 다시 시도해 주세요."
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("API key") ||
      errorMessage.includes("authentication")
    ) {
      throw new Error("API 키 인증에 실패했습니다. 서버 설정을 확인해주세요.");
    }

    if (
      errorMessage.includes("invalid") ||
      errorMessage.includes("format")
    ) {
      throw new Error(
        "이미지 형식이 올바르지 않습니다. JPEG, PNG 형식의 이미지를 사용해주세요."
      );
    }

    if (errorMessage.includes("size") || errorMessage.includes("too large")) {
      throw new Error(
        "이미지 크기가 너무 큽니다. 더 작은 이미지를 사용해주세요."
      );
    }

    throw new Error(
      `AI 분석에 실패했습니다: ${errorMessage}. 이미지를 확인하고 다시 시도해 주세요.`
    );
  }
}

/**
 * Validate and normalize risk level string
 */
function validateRiskLevel(level: string): RiskLevel {
  const validLevels: RiskLevel[] = ["High", "Medium", "Low", "Info"];
  const normalized =
    level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();

  if (validLevels.includes(normalized as RiskLevel)) {
    return normalized as RiskLevel;
  }

  return "Info";
}

