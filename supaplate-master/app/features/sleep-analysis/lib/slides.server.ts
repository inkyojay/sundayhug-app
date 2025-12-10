/**
 * Slide Generation Service (Server-side) - New Design
 *
 * Generates Instagram-optimized slides (1080x1350px) for sleep analysis reports.
 * Uses satori for SVG generation with custom fonts.
 * 
 * 슬라이드 구성 (6장):
 * 1. 썸네일: OO이의 수면환경 기록 일지
 * 2. 엄마의 현실일기
 * 3. 아기 전체 이미지 + 핀
 * 4. Bad 환경점수 + 추천 제품
 * 5. Good 총평
 * 6. 마지막장 CTA
 */
import type { ReactNode } from "react";
import satori from "satori";
import { readFileSync } from "fs";
import { join } from "path";

import type { AnalysisReport, RiskLevel } from "../schema";

// Instagram slide dimensions
const SLIDE_WIDTH = 1080;
const SLIDE_HEIGHT = 1350;

// Design colors (from template)
const BG_COLOR = "#F5F0E8"; // 베이지/크림색 배경
const HEADER_COLOR = "#5BB5C5"; // 하늘색/민트 헤더
const TEXT_COLOR = "#1a1a1a"; // 검정색 텍스트
const BRAND_NAME = "SUNDAY HUG";

// Risk level colors (for pins)
const RISK_COLORS: Record<RiskLevel, { bg: string; text: string }> = {
  High: { bg: "#EF5350", text: "#FFFFFF" }, // 빨강
  Medium: { bg: "#FFB300", text: "#1a1a1a" }, // 노랑
  Low: { bg: "#4CAF50", text: "#FFFFFF" }, // 초록
  Info: { bg: "#42A5F5", text: "#FFFFFF" }, // 파랑
};

// Traffic light colors
const TRAFFIC_LIGHTS = {
  red: "#EF5350",
  yellow: "#FFD54F",
  green: "#81C784",
};

// Helper function to create React elements for satori
function el(
  type: string,
  props: Record<string, unknown> | null,
  ...children: (ReactNode | string)[]
): ReactNode {
  return {
    type,
    props: {
      ...props,
      children: children.length === 1 ? children[0] : children,
    },
  } as unknown as ReactNode;
}

/**
 * Load font data for satori
 */
let fontCache: {
  cafe24: ArrayBuffer | null;
  pretendardBold: ArrayBuffer | null;
  pretendardRegular: ArrayBuffer | null;
} = {
  cafe24: null,
  pretendardBold: null,
  pretendardRegular: null,
};

async function loadFonts(): Promise<{
  cafe24: ArrayBuffer;
  pretendardBold: ArrayBuffer;
  pretendardRegular: ArrayBuffer;
}> {
  if (fontCache.cafe24 && fontCache.pretendardBold && fontCache.pretendardRegular) {
    return fontCache as {
      cafe24: ArrayBuffer;
      pretendardBold: ArrayBuffer;
      pretendardRegular: ArrayBuffer;
    };
  }

  const assetsPath = join(process.cwd(), "app/features/sleep-analysis/assets/fonts");
  
  try {
    fontCache.cafe24 = readFileSync(join(assetsPath, "Cafe24PROUP.ttf")).buffer;
    fontCache.pretendardBold = readFileSync(join(assetsPath, "Pretendard-Bold.ttf")).buffer;
    fontCache.pretendardRegular = readFileSync(join(assetsPath, "Pretendard-Regular.ttf")).buffer;
  } catch (error) {
    console.error("Font loading error, using fallback:", error);
    // Fallback: load from URL if local fails
    const [cafe24Res, boldRes, regularRes] = await Promise.all([
      fetch("https://cdn.jsdelivr.net/gh/niceplugin/Cafe24PROUP@main/Cafe24PROUP.ttf"),
      fetch("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/public/static/alternative/Pretendard-Bold.ttf"),
      fetch("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/public/static/alternative/Pretendard-Regular.ttf"),
    ]);
    fontCache.cafe24 = await cafe24Res.arrayBuffer();
    fontCache.pretendardBold = await boldRes.arrayBuffer();
    fontCache.pretendardRegular = await regularRes.arrayBuffer();
  }

  return fontCache as {
    cafe24: ArrayBuffer;
    pretendardBold: ArrayBuffer;
    pretendardRegular: ArrayBuffer;
  };
}

/**
 * Load icon as base64
 */
let iconCache: { sheep: string | null; logo: string | null } = { sheep: null, logo: null };

function loadIcons(): { sheep: string; logo: string } {
  if (iconCache.sheep && iconCache.logo) {
    return iconCache as { sheep: string; logo: string };
  }

  const assetsPath = join(process.cwd(), "app/features/sleep-analysis/assets/icons");
  
  try {
    const sheepBuffer = readFileSync(join(assetsPath, "sheep.png"));
    const logoBuffer = readFileSync(join(assetsPath, "logo.png"));
    iconCache.sheep = `data:image/png;base64,${sheepBuffer.toString("base64")}`;
    iconCache.logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Icon loading error:", error);
    iconCache.sheep = "";
    iconCache.logo = "";
  }

  return iconCache as { sheep: string; logo: string };
}

/**
 * Common header with traffic lights
 */
function createHeader(title: string): ReactNode {
  return el(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: HEADER_COLOR,
        padding: "20px 40px",
        borderBottom: "3px solid #1a1a1a",
      },
    },
    // Traffic lights
    el(
      "div",
      { style: { display: "flex", gap: 12 } },
      el("div", {
        style: {
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: TRAFFIC_LIGHTS.red,
        },
      }),
      el("div", {
        style: {
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: TRAFFIC_LIGHTS.yellow,
        },
      }),
      el("div", {
        style: {
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: TRAFFIC_LIGHTS.green,
        },
      })
    ),
    // Title
    el(
      "span",
      {
        style: {
          fontFamily: "Cafe24PROUP",
          fontSize: 36,
          color: TEXT_COLOR,
          fontWeight: "bold",
        },
      },
      title
    )
  );
}

/**
 * Speech bubble component
 */
function createSpeechBubble(text: string, width: number = 400): ReactNode {
  return el(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      },
    },
    el(
      "div",
      {
        style: {
          backgroundColor: "#FFFFFF",
          border: "2px solid #1a1a1a",
          borderRadius: 20,
          padding: "20px 24px",
          maxWidth: width,
          boxShadow: "4px 4px 0 #1a1a1a",
        },
      },
      el(
        "span",
        {
          style: {
            fontFamily: "Cafe24PROUP",
            fontSize: 24,
            color: TEXT_COLOR,
            lineHeight: 1.4,
          },
        },
        text
      )
    )
  );
}

/**
 * Slide 1: 썸네일 - OO이의 수면환경 기록 일지
 */
export async function generateThumbnailSlide(
  babyName: string,
  date: string,
  imageBase64: string,
  fonts: { cafe24: ArrayBuffer; pretendardBold: ArrayBuffer; pretendardRegular: ArrayBuffer }
): Promise<string> {
  const icons = loadIcons();
  const today = date || new Date().toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });

  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Pretendard",
      },
    },
    // Title bar (coral/red gradient)
    el(
      "div",
      {
        style: {
          backgroundColor: "#E57373",
          padding: "30px 60px",
          marginTop: 60,
          marginLeft: 60,
          marginRight: 60,
        },
      },
      el(
        "span",
        {
          style: {
            fontFamily: "Cafe24PROUP",
            fontSize: 52,
            color: "#FFFFFF",
            textShadow: "2px 2px 0 #1a1a1a",
          },
        },
        `${babyName || "OO"}이의 수면환경 기록 일지`
      )
    ),
    // Main content
    el(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 60px",
          position: "relative",
        },
      },
      // Date badge
      el(
        "div",
        {
          style: {
            position: "absolute",
            left: 80,
            top: 60,
            backgroundColor: "#81C784",
            padding: "10px 20px",
            borderRadius: 4,
          },
        },
        el(
          "span",
          {
            style: {
              fontFamily: "Pretendard",
              fontSize: 28,
              fontWeight: "bold",
              color: TEXT_COLOR,
            },
          },
          today
        )
      ),
      // Baby image with frame
      el(
        "div",
        {
          style: {
            marginTop: 80,
            border: "4px solid #1a1a1a",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "8px 8px 0 rgba(0,0,0,0.1)",
          },
        },
        el("img", {
          src: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          style: {
            width: 600,
            height: 700,
            objectFit: "cover",
          },
        })
      ),
      // Side icons
      el(
        "div",
        {
          style: {
            position: "absolute",
            right: 60,
            top: 100,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          },
        },
        // Cloud icon box
        el(
          "div",
          {
            style: {
              width: 70,
              height: 70,
              backgroundColor: "#90CAF9",
              borderRadius: 8,
              border: "2px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
          el("span", { style: { fontSize: 36 } }, "☁️")
        ),
        // Heart icon box
        el(
          "div",
          {
            style: {
              width: 70,
              height: 70,
              backgroundColor: "#A5D6A7",
              borderRadius: 8,
              border: "2px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
          el("span", { style: { fontSize: 36 } }, "🖤")
        ),
        // Search icon box
        el(
          "div",
          {
            style: {
              width: 70,
              height: 70,
              backgroundColor: "#FFE082",
              borderRadius: 8,
              border: "2px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
          el("span", { style: { fontSize: 36 } }, "🔍")
        )
      ),
      // Blue decoration block (bottom right)
      el("div", {
        style: {
          position: "absolute",
          right: 0,
          bottom: 100,
          width: 120,
          height: 200,
          backgroundColor: HEADER_COLOR,
        },
      })
    ),
    // Bottom: Sheep + speech bubble + brand
    el(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-end",
          padding: "0 60px 40px",
          gap: 20,
        },
      },
      // Sheep icon
      icons.sheep
        ? el("img", {
            src: icons.sheep,
            style: { width: 140, height: 140 },
          })
        : el("div", { style: { width: 140, height: 140, backgroundColor: "#eee", borderRadius: 70 } }),
      // Speech bubble
      createSpeechBubble("오늘은 꿀잠자기 목표!", 300),
      // Brand name
      el(
        "div",
        {
          style: {
            marginLeft: "auto",
            marginBottom: 20,
          },
        },
        el(
          "span",
          {
            style: {
              fontFamily: "Pretendard",
              fontSize: 28,
              fontWeight: "bold",
              color: TEXT_COLOR,
              letterSpacing: 2,
            },
          },
          BRAND_NAME
        )
      )
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: [
      { name: "Cafe24PROUP", data: fonts.cafe24, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardBold, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardRegular, weight: 400 },
    ],
  });

  return svg;
}

/**
 * Slide 2: 엄마의 현실일기
 */
export async function generateDiarySlide(
  momsDiary: string,
  babyName: string,
  imageBase64: string,
  date: string,
  fonts: { cafe24: ArrayBuffer; pretendardBold: ArrayBuffer; pretendardRegular: ArrayBuffer }
): Promise<string> {
  const today = date || new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric", weekday: "short" });
  const diaryLines = momsDiary.split("\\n").slice(0, 8); // 최대 8줄

  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Pretendard",
      },
    },
    // Header
    el(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: HEADER_COLOR,
          padding: "20px 40px",
          borderBottom: "3px solid #1a1a1a",
        },
      },
      el(
        "span",
        {
          style: {
            fontFamily: "Cafe24PROUP",
            fontSize: 32,
            color: TEXT_COLOR,
          },
        },
        `Date. ${today}  weather.  내 마음의 비.`
      )
    ),
    // Main content
    el(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          padding: "50px 60px",
          gap: 40,
        },
      },
      // Left: Baby image
      el(
        "div",
        {
          style: {
            border: "3px solid #1a1a1a",
            borderRadius: 8,
            overflow: "hidden",
            flexShrink: 0,
          },
        },
        el("img", {
          src: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          style: {
            width: 400,
            height: 500,
            objectFit: "cover",
          },
        })
      ),
      // Right: Diary text (notebook style)
      el(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            paddingTop: 20,
          },
        },
        ...diaryLines.map((line, i) =>
          el(
            "div",
            {
              key: i,
              style: {
                borderBottom: "1px solid #ccc",
                padding: "16px 0",
                minHeight: 50,
              },
            },
            el(
              "span",
              {
                style: {
                  fontFamily: "Cafe24PROUP",
                  fontSize: 30,
                  color: TEXT_COLOR,
                },
              },
              line.replace("00", babyName || "00")
            )
          )
        ),
        // Empty lines for notebook effect
        ...Array(Math.max(0, 8 - diaryLines.length))
          .fill(null)
          .map((_, i) =>
            el("div", {
              key: `empty-${i}`,
              style: {
                borderBottom: "1px solid #ccc",
                padding: "16px 0",
                minHeight: 50,
              },
            })
          )
      )
    ),
    // Bottom diary continuation
    el(
      "div",
      {
        style: {
          padding: "20px 60px 40px",
        },
      },
      el(
        "div",
        {
          style: {
            borderBottom: "1px solid #ccc",
            padding: "12px 0",
          },
        },
        el(
          "span",
          {
            style: {
              fontFamily: "Cafe24PROUP",
              fontSize: 28,
              color: TEXT_COLOR,
            },
          },
          "왜 안자는거야...?? 하루종일 눈 말똥말똥.."
        )
      ),
      el(
        "div",
        {
          style: {
            borderBottom: "1px solid #ccc",
            padding: "12px 0",
          },
        },
        el(
          "span",
          {
            style: {
              fontFamily: "Cafe24PROUP",
              fontSize: 28,
              color: TEXT_COLOR,
            },
          },
          "그래도 귀엽긴 해.."
        )
      ),
      // More empty lines
      el("div", { style: { borderBottom: "1px solid #ccc", padding: "12px 0", minHeight: 40 } }),
      el("div", { style: { borderBottom: "1px solid #ccc", padding: "12px 0", minHeight: 40 } }),
      el("div", { style: { borderBottom: "1px solid #ccc", padding: "12px 0", minHeight: 40 } })
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: [
      { name: "Cafe24PROUP", data: fonts.cafe24, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardBold, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardRegular, weight: 400 },
    ],
  });

  return svg;
}

/**
 * Slide 3: 아기 전체 이미지 + 핀 번호
 */
export async function generateImageWithPinsSlide(
  imageBase64: string,
  feedbackItems: AnalysisReport["feedbackItems"],
  safetyScore: number,
  babyName: string,
  fonts: { cafe24: ArrayBuffer; pretendardBold: ArrayBuffer; pretendardRegular: ArrayBuffer }
): Promise<string> {
  const icons = loadIcons();

  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Pretendard",
      },
    },
    // Header
    createHeader("우리 아이의 수면 환경은?"),
    // Main image with pins
    el(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px 50px",
        },
      },
      el(
        "div",
        {
          style: {
            position: "relative",
            border: "4px solid #1a1a1a",
            borderRadius: 8,
            overflow: "visible",
          },
        },
        // Image
        el("img", {
          src: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          style: {
            width: 750,
            height: 900,
            objectFit: "cover",
            borderRadius: 4,
          },
        }),
        // Pins
        ...feedbackItems.slice(0, 5).map((item, i) => {
          const colors = RISK_COLORS[item.riskLevel] || RISK_COLORS.Info;
          return el(
            "div",
            {
              key: i,
              style: {
                position: "absolute",
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: "translate(-50%, -50%)",
                width: 56,
                height: 56,
                backgroundColor: colors.bg,
                borderRadius: 28,
                border: "3px solid #1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "3px 3px 0 rgba(0,0,0,0.3)",
              },
            },
            el(
              "span",
              {
                style: {
                  fontFamily: "Cafe24PROUP",
                  fontSize: 28,
                  fontWeight: "bold",
                  color: colors.text,
                },
              },
              String(item.id)
            )
          );
        })
      )
    ),
    // Bottom: Sheep + score speech bubble
    el(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-end",
          padding: "0 60px 40px",
          gap: 20,
        },
      },
      // Sheep icon
      icons.sheep
        ? el("img", {
            src: icons.sheep,
            style: { width: 140, height: 140 },
          })
        : el("div", { style: { width: 140 } }),
      // Score speech bubble
      createSpeechBubble(`${babyName || "OO"}이 수면환경 점수는\n${safetyScore}점이에요..`, 380)
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: [
      { name: "Cafe24PROUP", data: fonts.cafe24, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardBold, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardRegular, weight: 400 },
    ],
  });

  return svg;
}

/**
 * Slide 4: Bad 환경점수 + 추천 제품
 */
export async function generateBadFeedbackSlide(
  feedbackItems: AnalysisReport["feedbackItems"],
  imageBase64: string,
  recommendedProducts: Array<{ name: string; short_name: string; image_url: string; description: string }>,
  fonts: { cafe24: ArrayBuffer; pretendardBold: ArrayBuffer; pretendardRegular: ArrayBuffer }
): Promise<string> {
  // High/Medium 위험도 항목만 필터링
  const badItems = feedbackItems.filter((item) => item.riskLevel === "High" || item.riskLevel === "Medium").slice(0, 3);

  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Pretendard",
      },
    },
    // Header
    createHeader("환경 주의가 필요해요"),
    // Bad section
    el(
      "div",
      {
        style: {
          padding: "30px 50px",
        },
      },
      el(
        "span",
        {
          style: {
            fontFamily: "Cafe24PROUP",
            fontSize: 36,
            color: TEXT_COLOR,
          },
        },
        "bad"
      )
    ),
    // 3-column feedback items
    el(
      "div",
      {
        style: {
          display: "flex",
          padding: "0 50px",
          gap: 24,
        },
      },
      ...badItems.map((item, i) => {
        const colors = RISK_COLORS[item.riskLevel] || RISK_COLORS.Medium;
        return el(
          "div",
          {
            key: i,
            style: {
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            },
          },
          // Image crop
          el(
            "div",
            {
              style: {
                width: 280,
                height: 200,
                border: "2px solid #1a1a1a",
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 16,
              },
            },
            el("img", {
              src: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              style: {
                width: "100%",
                height: "100%",
                objectFit: "cover",
              },
            })
          ),
          // Number badge + title
          el(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              },
            },
            el(
              "div",
              {
                style: {
                  width: 36,
                  height: 36,
                  backgroundColor: colors.bg,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
              el(
                "span",
                {
                  style: {
                    fontFamily: "Cafe24PROUP",
                    fontSize: 20,
                    color: colors.text,
                  },
                },
                String(item.id)
              )
            ),
            el(
              "span",
              {
                style: {
                  fontFamily: "Cafe24PROUP",
                  fontSize: 26,
                  color: TEXT_COLOR,
                },
              },
              item.title
            )
          ),
          // Feedback text
          el(
            "p",
            {
              style: {
                fontFamily: "Pretendard",
                fontSize: 20,
                color: "#666",
                textAlign: "center",
                lineHeight: 1.4,
                padding: "0 10px",
              },
            },
            item.feedback
          )
        );
      })
    ),
    // 추천 제품 section
    el(
      "div",
      {
        style: {
          padding: "40px 50px 20px",
        },
      },
      el(
        "span",
        {
          style: {
            fontFamily: "Cafe24PROUP",
            fontSize: 32,
            color: TEXT_COLOR,
          },
        },
        "추천 제품"
      )
    ),
    // Product cards
    el(
      "div",
      {
        style: {
          display: "flex",
          padding: "0 50px 40px",
          gap: 24,
        },
      },
      ...recommendedProducts.slice(0, 3).map((product, i) =>
        el(
          "div",
          {
            key: i,
            style: {
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              border: "2px solid #1a1a1a",
              overflow: "hidden",
            },
          },
          // Product name header
          el(
            "div",
            {
              style: {
                backgroundColor: "#F5F5F5",
                padding: "12px 16px",
                borderBottom: "1px solid #eee",
              },
            },
            el(
              "span",
              {
                style: {
                  fontFamily: "Pretendard",
                  fontSize: 20,
                  fontWeight: "bold",
                  color: TEXT_COLOR,
                },
              },
              product.short_name
            )
          ),
          // Product image
          el(
            "div",
            {
              style: {
                padding: 16,
                display: "flex",
                justifyContent: "center",
              },
            },
            el("img", {
              src: product.image_url,
              style: {
                width: 200,
                height: 200,
                objectFit: "contain",
              },
            })
          ),
          // Description
          el(
            "div",
            {
              style: {
                padding: "0 16px 16px",
              },
            },
            el(
              "p",
              {
                style: {
                  fontFamily: "Pretendard",
                  fontSize: 16,
                  color: "#666",
                  lineHeight: 1.4,
                },
              },
              `> ${product.description}`
            )
          )
        )
      )
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: [
      { name: "Cafe24PROUP", data: fonts.cafe24, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardBold, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardRegular, weight: 400 },
    ],
  });

  return svg;
}

/**
 * Slide 5: Good 총평
 */
export async function generateGoodSummarySlide(
  feedbackItems: AnalysisReport["feedbackItems"],
  summary: string,
  imageBase64: string,
  fonts: { cafe24: ArrayBuffer; pretendardBold: ArrayBuffer; pretendardRegular: ArrayBuffer }
): Promise<string> {
  const icons = loadIcons();
  // Low/Info 항목만 필터링 (잘한 점)
  const goodItems = feedbackItems.filter((item) => item.riskLevel === "Low" || item.riskLevel === "Info").slice(0, 3);

  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Pretendard",
      },
    },
    // Header
    createHeader("아주 잘하고 있어요!"),
    // Good section
    el(
      "div",
      {
        style: {
          padding: "30px 50px",
        },
      },
      el(
        "span",
        {
          style: {
            fontFamily: "Cafe24PROUP",
            fontSize: 36,
            color: TEXT_COLOR,
          },
        },
        "good"
      )
    ),
    // 3-column good items
    el(
      "div",
      {
        style: {
          display: "flex",
          padding: "0 50px",
          gap: 24,
        },
      },
      ...goodItems.map((item, i) => {
        const colors = RISK_COLORS[item.riskLevel] || RISK_COLORS.Info;
        return el(
          "div",
          {
            key: i,
            style: {
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            },
          },
          // Image crop
          el(
            "div",
            {
              style: {
                width: 280,
                height: 200,
                border: "2px solid #1a1a1a",
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 16,
              },
            },
            el("img", {
              src: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              style: {
                width: "100%",
                height: "100%",
                objectFit: "cover",
              },
            })
          ),
          // Number badge + title
          el(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              },
            },
            el(
              "div",
              {
                style: {
                  width: 36,
                  height: 36,
                  backgroundColor: colors.bg,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
              el(
                "span",
                {
                  style: {
                    fontFamily: "Cafe24PROUP",
                    fontSize: 20,
                    color: colors.text,
                  },
                },
                String(item.id)
              )
            ),
            el(
              "span",
              {
                style: {
                  fontFamily: "Cafe24PROUP",
                  fontSize: 26,
                  color: TEXT_COLOR,
                },
              },
              item.title
            )
          ),
          // Feedback text
          el(
            "p",
            {
              style: {
                fontFamily: "Pretendard",
                fontSize: 20,
                color: "#666",
                textAlign: "center",
                lineHeight: 1.4,
                padding: "0 10px",
              },
            },
            item.feedback
          )
        );
      })
    ),
    // Summary section with sheep
    el(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          padding: "40px 50px 40px",
          gap: 30,
        },
      },
      // Sheep icon
      icons.sheep
        ? el("img", {
            src: icons.sheep,
            style: { width: 180, height: 180 },
          })
        : el("div", { style: { width: 180 } }),
      // Summary speech bubble
      el(
        "div",
        {
          style: {
            flex: 1,
            backgroundColor: "#FFFFFF",
            border: "3px solid #1a1a1a",
            borderRadius: 24,
            padding: "30px 36px",
            boxShadow: "6px 6px 0 #1a1a1a",
          },
        },
        el(
          "p",
          {
            style: {
              fontFamily: "Cafe24PROUP",
              fontSize: 28,
              color: TEXT_COLOR,
              lineHeight: 1.5,
            },
          },
          summary
        )
      )
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: [
      { name: "Cafe24PROUP", data: fonts.cafe24, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardBold, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardRegular, weight: 400 },
    ],
  });

  return svg;
}

/**
 * Slide 6: 마지막장 CTA
 */
export async function generateEndingSlide(
  fonts: { cafe24: ArrayBuffer; pretendardBold: ArrayBuffer; pretendardRegular: ArrayBuffer }
): Promise<string> {
  const icons = loadIcons();

  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Pretendard",
        padding: 60,
      },
    },
    // Title
    el(
      "h1",
      {
        style: {
          fontFamily: "Cafe24PROUP",
          fontSize: 56,
          color: TEXT_COLOR,
          textAlign: "center",
          marginBottom: 20,
          lineHeight: 1.3,
        },
      },
      "우리 아기 수면"
    ),
    el(
      "h1",
      {
        style: {
          fontFamily: "Cafe24PROUP",
          fontSize: 56,
          color: TEXT_COLOR,
          textAlign: "center",
          marginBottom: 60,
          lineHeight: 1.3,
        },
      },
      "AI가 다정하게 알려드려요"
    ),
    // Image with sheep (oval frame with blue background)
    el(
      "div",
      {
        style: {
          position: "relative",
          width: 600,
          height: 500,
          marginBottom: 50,
        },
      },
      // Blue blob background
      el("div", {
        style: {
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: HEADER_COLOR,
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
        },
      }),
      // Placeholder baby image area
      el(
        "div",
        {
          style: {
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            height: 400,
            backgroundColor: "#FFFFFF",
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            border: "4px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          },
        },
        el(
          "span",
          {
            style: {
              fontFamily: "Pretendard",
              fontSize: 24,
              color: "#999",
            },
          },
          "아기 이미지"
        )
      ),
      // Sheep icon
      icons.sheep
        ? el("img", {
            src: icons.sheep,
            style: {
              position: "absolute",
              left: -40,
              top: "50%",
              transform: "translateY(-50%)",
              width: 140,
              height: 140,
            },
          })
        : null
    ),
    // CTA Button
    el(
      "div",
      {
        style: {
          backgroundColor: "#1a1a1a",
          borderRadius: 50,
          padding: "24px 60px",
          marginBottom: 40,
        },
      },
      el(
        "span",
        {
          style: {
            fontFamily: "Cafe24PROUP",
            fontSize: 28,
            color: "#FFFFFF",
          },
        },
        "썬데이허그 AI 수면 환경 분석 받으러 가기"
      )
    ),
    // Subtitle
    el(
      "p",
      {
        style: {
          fontFamily: "Pretendard",
          fontSize: 24,
          color: "#666",
          textAlign: "center",
          marginBottom: 10,
        },
      },
      "한 장의 사진만 올리면 바로 분석!"
    ),
    el(
      "p",
      {
        style: {
          fontFamily: "Pretendard",
          fontSize: 24,
          color: "#666",
          textAlign: "center",
          marginBottom: 50,
        },
      },
      "전문가가 짚어주는 맞춤 가이드 제공"
    ),
    // Brand logo
    icons.logo
      ? el("img", {
          src: icons.logo,
          style: { height: 40 },
        })
      : el(
          "span",
          {
            style: {
              fontFamily: "Pretendard",
              fontSize: 28,
              fontWeight: "bold",
              color: TEXT_COLOR,
              letterSpacing: 4,
            },
          },
          BRAND_NAME
        )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: [
      { name: "Cafe24PROUP", data: fonts.cafe24, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardBold, weight: 700 },
      { name: "Pretendard", data: fonts.pretendardRegular, weight: 400 },
    ],
  });

  return svg;
}

/**
 * Get recommended products from database based on feedback keywords
 */
export async function getRecommendedProducts(
  feedbackItems: AnalysisReport["feedbackItems"]
): Promise<Array<{ name: string; short_name: string; image_url: string; description: string }>> {
  // 기본 추천 제품 (DB 연동 전 하드코딩)
  const defaultProducts = [
    {
      name: "썬데이허그 꿀잠 백색소음기",
      short_name: "백색소음기",
      image_url: "https://sundayhug.kr/web/product/small/202507/89033de92e07d5446d9fb05e842401ae.jpg",
      description: "침대위에는 조용한 소음기만",
    },
    {
      name: "썬데이허그 ABC 접이식 아기침대",
      short_name: "ABC 접이식 아기침대",
      image_url: "https://sundayhug.kr/web/product/small/202511/732eb190f66fc48a48122e77be971077.jpg",
      description: "단단하고 평평한 침대추천",
    },
    {
      name: "썬데이허그 슬리핑백",
      short_name: "슬리핑백",
      image_url: "https://sundayhug.kr/web/product/tiny/202506/32c67b05a529f01c5debf86657571466.jpg",
      description: "이불 대신 발끝까지 따뜻하게",
    },
  ];

  return defaultProducts;
}

/**
 * Generate all slides for a report (new design - 6 slides)
 */
export async function generateAllSlides(
  report: AnalysisReport,
  imageBase64?: string,
  babyName?: string
): Promise<string[]> {
  const fonts = await loadFonts();
  const slides: string[] = [];

  const today = new Date().toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });

  const name = babyName || "OO";

  // Slide 1: 썸네일
  if (imageBase64) {
    slides.push(await generateThumbnailSlide(name, today, imageBase64, fonts));
  }

  // Slide 2: 엄마의 현실일기
  if (imageBase64 && report.momsDiary) {
    slides.push(await generateDiarySlide(report.momsDiary, name, imageBase64, today, fonts));
  }

  // Slide 3: 아기 전체 이미지 + 핀
  if (imageBase64) {
    slides.push(
      await generateImageWithPinsSlide(imageBase64, report.feedbackItems, report.safetyScore, name, fonts)
    );
  }

  // Slide 4: Bad 환경점수 + 추천 제품
  if (imageBase64) {
    const recommendedProducts = await getRecommendedProducts(report.feedbackItems);
    slides.push(await generateBadFeedbackSlide(report.feedbackItems, imageBase64, recommendedProducts, fonts));
  }

  // Slide 5: Good 총평
  if (imageBase64) {
    slides.push(await generateGoodSummarySlide(report.feedbackItems, report.summary, imageBase64, fonts));
  }

  // Slide 6: 마지막장 CTA
  slides.push(await generateEndingSlide(fonts));

  return slides;
}

/**
 * Convert SVG to data URL
 */
export function svgToDataUrl(svg: string): string {
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Convert SVG string to PNG Buffer using resvg
 */
async function svgToPng(svg: string): Promise<Buffer> {
  try {
    const { Resvg } = await import("@resvg/resvg-js");
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: "width",
        value: SLIDE_WIDTH,
      },
    });
    const pngData = resvg.render();
    return pngData.asPng();
  } catch (error) {
    console.error("SVG to PNG conversion error:", error);
    // Fallback: return SVG as buffer
    return Buffer.from(svg);
  }
}

/**
 * Generate all slides as PNG buffers
 */
export async function generateAllSlidesAsPng(
  report: AnalysisReport,
  imageBase64?: string,
  babyName?: string
): Promise<Buffer[]> {
  const svgSlides = await generateAllSlides(report, imageBase64, babyName);
  const pngBuffers: Buffer[] = [];

  for (const svg of svgSlides) {
    const pngBuffer = await svgToPng(svg);
    pngBuffers.push(pngBuffer);
  }

  return pngBuffers;
}
