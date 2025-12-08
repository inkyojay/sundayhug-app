/**
 * Slide Generation Service (Server-side)
 *
 * Generates Instagram-optimized slides (1080x1350px) for sleep analysis reports.
 * Uses satori for SVG generation.
 */
import type { ReactNode } from "react";
import satori from "satori";

import type { AnalysisReport, RiskLevel } from "../schema";

// Instagram slide dimensions
const SLIDE_WIDTH = 1080;
const SLIDE_HEIGHT = 1350;

// Design colors
const BRAND_HANDLE = "@sundayhug.kr";
const BG_COLOR = "#FFFBF5";
const TEXT_COLOR = "#2d2d2d";
const ACCENT_COLOR = "#8B4E5C";

// Risk level colors
const RISK_COLORS: Record<RiskLevel, { bg: string; border: string; text: string; pin: string }> = {
  High: { bg: "#FFEBEE", border: "#EF5350", text: "#C62828", pin: "#EF5350" },
  Medium: { bg: "#FFF8E1", border: "#FFB300", text: "#E65100", pin: "#FFB300" },
  Low: { bg: "#E8F5E9", border: "#4CAF50", text: "#2E7D32", pin: "#4CAF50" },
  Info: { bg: "#E3F2FD", border: "#42A5F5", text: "#1565C0", pin: "#42A5F5" },
};

/**
 * Load font data for satori
 * Note: satori only supports TTF/OTF formats, not woff/woff2
 */
async function loadFontData(): Promise<ArrayBuffer> {
  // Read font from local file system
  const fs = await import("fs/promises");
  const path = await import("path");
  
  try {
    // Try multiple possible paths
    const possiblePaths = [
      path.join(process.cwd(), "public", "fonts", "NotoSansKR-Bold.ttf"),
      path.join(process.cwd(), "fonts", "NotoSansKR-Bold.ttf"),
      "/Users/inkyo/Desktop/sleep-analyzer-v2/public/fonts/NotoSansKR-Bold.ttf",
    ];
    
    for (const fontPath of possiblePaths) {
      try {
        const fontBuffer = await fs.readFile(fontPath);
        console.log("Font loaded from:", fontPath);
        return fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
      } catch {
        // Try next path
      }
    }
    
    // Fallback: Try Google Fonts CDN
    console.log("Trying Google Fonts CDN...");
    const response = await fetch(
      "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf"
    );
    if (response.ok) {
      return await response.arrayBuffer();
    }
    
    throw new Error("All font loading methods failed");
  } catch (error) {
    console.error("Font loading error:", error);
    throw new Error("No fonts are loaded. At least one font is required to calculate the layout.");
  }
}

/**
 * Create satori element helper
 */
function el(
  type: string,
  props: Record<string, unknown>,
  ...children: (ReactNode | string | number)[]
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
 * Generate intro slide (Slide 1)
 */
export async function generateIntroSlide(
  totalSlides: number,
  fontData: ArrayBuffer
): Promise<string> {
  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        padding: 60,
        display: "flex",
        flexDirection: "column",
        fontFamily: "NotoSansKR",
      },
    },
    // Header
    el(
      "div",
      { style: { display: "flex", justifyContent: "space-between", marginBottom: 40 } },
      el("span", { style: { fontSize: 32, fontWeight: "bold", color: TEXT_COLOR } }, BRAND_HANDLE),
      el("span", { style: { fontSize: 32, color: TEXT_COLOR } }, `1/${totalSlides}`)
    ),
    // Main content
    el(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        },
      },
      el(
        "div",
        { style: { fontSize: 42, color: ACCENT_COLOR, marginBottom: 40 } },
        "썬데이허그와 함께하는"
      ),
      el(
        "div",
        {
          style: {
            fontSize: 72,
            color: TEXT_COLOR,
            fontWeight: 900,
            marginBottom: 100,
            lineHeight: 1.4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          },
        },
        el("span", {}, "우리아기"),
        el("span", {}, "안전한 수면환경"),
        el("span", {}, "만들기")
      ),
      el(
        "div",
        {
          style: {
            backgroundColor: "#3D4F5F",
            color: "white",
            padding: "24px 56px",
            borderRadius: 50,
            fontSize: 32,
            letterSpacing: 2,
          },
        },
        "수면 환경 분석 레포트"
      )
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: fontData.byteLength > 0
      ? [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" as const }]
      : [],
  });

  return svg;
}

/**
 * Generate image slide with pins (Slide 2)
 */
export async function generateImageSlide(
  imageBase64: string,
  feedbackItems: AnalysisReport["feedbackItems"],
  slideNumber: number,
  totalSlides: number,
  fontData: ArrayBuffer
): Promise<string> {
  // Create pin elements for each feedback item
  const pinElements = feedbackItems.map((item) => {
    const colors = RISK_COLORS[item.riskLevel as RiskLevel] || RISK_COLORS.Info;
    return el(
      "div",
      {
        style: {
          position: "absolute",
          left: `${item.x}%`,
          top: `${item.y}%`,
          transform: "translate(-50%, -50%)",
          width: 48,
          height: 48,
          backgroundColor: colors.pin,
          borderRadius: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        },
      },
      String(item.id)
    );
  });

  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        padding: 60,
        display: "flex",
        flexDirection: "column",
        fontFamily: "NotoSansKR",
      },
    },
    // Header
    el(
      "div",
      { style: { display: "flex", justifyContent: "space-between", marginBottom: 40 } },
      el("span", { style: { fontSize: 32, fontWeight: "bold", color: TEXT_COLOR } }, BRAND_HANDLE),
      el("span", { style: { fontSize: 32, color: TEXT_COLOR } }, `${slideNumber}/${totalSlides}`)
    ),
    // Title
    el(
      "div",
      { style: { fontSize: 52, fontWeight: "bold", color: TEXT_COLOR, marginBottom: 30 } },
      "분석 이미지"
    ),
    // Image container with pins - 핀이 이미지 영역 내에 정확히 배치되도록 설정
    el(
      "div",
      {
        style: {
          flex: 1,
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a1a1a",
        },
      },
      // 이미지와 핀을 같은 크기로 감싸는 내부 컨테이너
      el(
        "div",
        {
          style: {
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
        },
        el("img", {
          src: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          style: {
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          },
        }),
        // 핀 오버레이 - 이미지 전체 영역에 오버레이
        ...pinElements
      )
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: fontData.byteLength > 0
      ? [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" as const }]
      : [],
  });

  return svg;
}


/**
 * Generate summary slide(s) - splits into multiple pages if needed
 */
export async function generateSummarySlides(
  summary: string,
  startSlideNumber: number,
  totalSlides: number,
  fontData: ArrayBuffer
): Promise<string[]> {
  // 한 페이지에 약 600자 정도 (글씨 크기 줄임)
  const MAX_CHARS_PER_PAGE = 600;
  const slides: string[] = [];
  
  // Split summary into pages if too long
  const sentences = summary.split(/(?<=[.!?])\s*/);
  const pages: string[] = [];
  let currentPage = "";
  
  for (const sentence of sentences) {
    if (!sentence.trim()) continue;
    
    if (currentPage.length + sentence.length > MAX_CHARS_PER_PAGE && currentPage.length > 0) {
      pages.push(currentPage.trim());
      currentPage = sentence + " ";
    } else {
      currentPage += sentence + " ";
    }
  }
  
  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }
  
  // If only one page, keep it simple
  if (pages.length === 0) {
    pages.push(summary);
  }
  
  // Generate slide for each page
  for (let i = 0; i < pages.length; i++) {
    const pageContent = pages[i];
    const slideNum = startSlideNumber + i;
    const pageLabel = pages.length > 1 ? ` (${i + 1}/${pages.length})` : "";
    
    const element = el(
      "div",
      {
        style: {
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          backgroundColor: BG_COLOR,
          padding: 60,
          display: "flex",
          flexDirection: "column",
          fontFamily: "NotoSansKR",
        },
      },
      // Header
      el(
        "div",
        { style: { display: "flex", justifyContent: "space-between", marginBottom: 30 } },
        el("span", { style: { fontSize: 28, fontWeight: "bold", color: TEXT_COLOR } }, BRAND_HANDLE),
        el("span", { style: { fontSize: 28, color: TEXT_COLOR } }, `${slideNum}/${totalSlides}`)
      ),
      // Title
      el(
        "div",
        { style: { fontSize: 44, fontWeight: "bold", color: TEXT_COLOR, marginBottom: 30 } },
        `종합 요약${pageLabel}`
      ),
      // Content (no highlight)
      el(
        "div",
        {
          style: {
            flex: 1,
            backgroundColor: "white",
            borderRadius: 24,
            padding: 40,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          },
        },
        el(
          "div",
          { style: { fontSize: 26, lineHeight: 1.9, color: TEXT_COLOR } },
          pageContent
        )
      )
    );

    const svg = await satori(element, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      fonts: fontData.byteLength > 0
        ? [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" as const }]
        : [],
    });

    slides.push(svg);
  }

  return slides;
}

/**
 * Generate single feedback item slide
 */
export async function generateFeedbackSlide(
  item: AnalysisReport["feedbackItems"][0],
  slideNumber: number,
  totalSlides: number,
  fontData: ArrayBuffer
): Promise<string> {
  const colors = RISK_COLORS[item.riskLevel as RiskLevel] || RISK_COLORS.Info;

  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        padding: 60,
        display: "flex",
        flexDirection: "column",
        fontFamily: "NotoSansKR",
      },
    },
    // Header
    el(
      "div",
      { style: { display: "flex", justifyContent: "space-between", marginBottom: 40 } },
      el("span", { style: { fontSize: 32, fontWeight: "bold", color: TEXT_COLOR } }, BRAND_HANDLE),
      el("span", { style: { fontSize: 32, color: TEXT_COLOR } }, `${slideNumber}/${totalSlides}`)
    ),
    // Title
    el(
      "div",
      { style: { fontSize: 52, fontWeight: "bold", color: TEXT_COLOR, marginBottom: 40 } },
      "상세분석"
    ),
    // Feedback card
    el(
      "div",
      {
        style: {
          flex: 1,
          backgroundColor: colors.bg,
          borderLeft: `10px solid ${colors.border}`,
          borderRadius: 24,
          padding: 50,
          display: "flex",
          flexDirection: "column",
        },
      },
      // Header with number and title
      el(
        "div",
        { style: { display: "flex", alignItems: "center", marginBottom: 30 } },
        el(
          "div",
          {
            style: {
              width: 64,
              height: 64,
              backgroundColor: colors.pin,
              color: "white",
              borderRadius: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: "bold",
              marginRight: 24,
            },
          },
          String(item.id)
        ),
        el(
          "div",
          { style: { display: "flex", flexDirection: "column" } },
          el(
            "div",
            { style: { fontSize: 40, fontWeight: "bold", color: colors.text } },
            item.title
          ),
          el(
            "div",
            {
              style: {
                fontSize: 28,
                color: colors.text,
                marginTop: 8,
                display: "flex",
                alignItems: "center",
              },
            },
            el("span", {}, "위험도: "),
            el(
              "span",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  marginLeft: 8,
                  padding: "4px 12px",
                  backgroundColor: colors.border,
                  color: "white",
                  borderRadius: 12,
                  fontWeight: "bold",
                },
              },
              item.riskLevel === "High" ? "높음" : item.riskLevel === "Medium" ? "중간" : item.riskLevel === "Low" ? "낮음" : "정보"
            )
          )
        )
      ),
      // Feedback content
      el(
        "div",
        {
          style: {
            fontSize: 30,
            lineHeight: 1.9,
            color: TEXT_COLOR,
            flex: 1,
          },
        },
        item.feedback
      )
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: fontData.byteLength > 0
      ? [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" as const }]
      : [],
  });

  return svg;
}

/**
 * Generate ending slide
 */
export async function generateEndingSlide(
  slideNumber: number,
  totalSlides: number,
  fontData: ArrayBuffer
): Promise<string> {
  const element = el(
    "div",
    {
      style: {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: BG_COLOR,
        padding: 60,
        display: "flex",
        flexDirection: "column",
        fontFamily: "NotoSansKR",
      },
    },
    // Header
    el(
      "div",
      { style: { display: "flex", justifyContent: "space-between", marginBottom: 40 } },
      el("span", { style: { fontSize: 32, fontWeight: "bold", color: TEXT_COLOR } }, BRAND_HANDLE),
      el("span", { style: { fontSize: 32, color: TEXT_COLOR } }, `${slideNumber}/${totalSlides}`)
    ),
    // Main content
    el(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        },
      },
      el(
        "div",
        { style: { fontSize: 48, color: ACCENT_COLOR, marginBottom: 40 } },
        "우리 아기의 안전한 수면을 위해"
      ),
      el(
        "div",
        {
          style: {
            fontSize: 64,
            color: TEXT_COLOR,
            fontWeight: 900,
            marginBottom: 60,
            lineHeight: 1.4,
          },
        },
        "오늘도 썬데이허그가 함께합니다"
      ),
      el(
        "div",
        {
          style: {
            fontSize: 32,
            color: "#666",
            marginTop: 40,
          },
        },
        "더 많은 육아 정보는 @sundayhug.kr"
      )
    )
  );

  const svg = await satori(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts: fontData.byteLength > 0
      ? [{ name: "NotoSansKR", data: fontData, weight: 700, style: "normal" as const }]
      : [],
  });

  return svg;
}

/**
 * Generate all slides for a report
 *
 * @param report - Analysis report data
 * @param imageBase64 - Original image in base64 (optional)
 * @returns Array of SVG strings
 */
export async function generateAllSlides(
  report: AnalysisReport,
  imageBase64?: string
): Promise<string[]> {
  const fontData = await loadFontData();
  const slides: string[] = [];

  // 먼저 요약 페이지 수 계산 (긴 요약은 여러 페이지)
  const summaryLength = report.summary.length;
  const summaryPageCount = Math.ceil(summaryLength / 600) || 1;

  // Calculate total slides:
  // 1 (intro) + 1 (image) + N (summary pages) + N (feedback items) + 1 (ending)
  const totalSlides = 2 + summaryPageCount + report.feedbackItems.length + 1;

  // Slide 1: Intro
  slides.push(await generateIntroSlide(totalSlides, fontData));

  // Slide 2: Image with pins (if image available)
  if (imageBase64) {
    slides.push(
      await generateImageSlide(imageBase64, report.feedbackItems, 2, totalSlides, fontData)
    );
  }

  // Slides 3+: Summary (may be multiple pages)
  const summarySlides = await generateSummarySlides(
    report.summary,
    imageBase64 ? 3 : 2,
    totalSlides,
    fontData
  );
  slides.push(...summarySlides);

  // Calculate starting slide number for feedback
  const feedbackStartSlide = (imageBase64 ? 3 : 2) + summarySlides.length;

  // Feedback slides
  for (let i = 0; i < report.feedbackItems.length; i++) {
    slides.push(
      await generateFeedbackSlide(
        report.feedbackItems[i],
        feedbackStartSlide + i,
        totalSlides,
        fontData
      )
    );
  }

  // Last slide: Ending
  slides.push(await generateEndingSlide(totalSlides, totalSlides, fontData));

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
 * Convert SVG string to PNG buffer using sharp
 */
export async function svgToPng(svgString: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const svgBuffer = Buffer.from(svgString);
  return sharp(svgBuffer).png().toBuffer();
}

/**
 * Generate all slides as PNG buffers
 */
export async function generateAllSlidesAsPng(
  report: AnalysisReport,
  imageBase64?: string
): Promise<Buffer[]> {
  const svgSlides = await generateAllSlides(report, imageBase64);
  const pngBuffers: Buffer[] = [];
  
  for (const svg of svgSlides) {
    const pngBuffer = await svgToPng(svg);
    pngBuffers.push(pngBuffer);
  }
  
  return pngBuffers;
}
