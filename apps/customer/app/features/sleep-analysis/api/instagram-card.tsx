/**
 * 인스타그램 카드 이미지 생성 API
 * 
 * @vercel/og를 사용하여 한글 폰트 지원
 * 
 * GET /api/sleep/:id/instagram-card
 * Query: style=square (1:1) | vertical (4:5)
 */
import type { Route } from "./+types/instagram-card";
import { ImageResponse } from "@vercel/og";
import makeServerClient from "~/core/lib/supa-client.server";

// 점수에 따른 색상
function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#84cc16";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

// 점수에 따른 등급
function getScoreGrade(score: number): string {
  if (score >= 90) return "매우 안전해요! 🎉";
  if (score >= 75) return "안전한 환경이에요 👍";
  if (score >= 60) return "개선이 필요해요";
  if (score >= 40) return "주의가 필요해요 ⚠️";
  return "즉시 개선 필요! 🚨";
}

// 별점 생성
function getStars(score: number): string {
  const starCount = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  return "⭐".repeat(starCount);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params;
  
  if (!id) {
    return new Response("Analysis ID is required", { status: 400 });
  }

  const [supabase] = makeServerClient(request);
  
  // 분석 데이터 조회
  const { data: analysis, error } = await supabase
    .from("sleep_analyses")
    .select("id, summary, created_at")
    .eq("id", id)
    .single();

  if (error || !analysis) {
    return new Response("Analysis not found", { status: 404 });
  }

  // 피드백 항목 조회
  const { data: feedbackItems } = await supabase
    .from("sleep_analysis_feedback_items")
    .select("risk_level")
    .eq("analysis_id", id);

  // summary에서 점수 정보 추출
  let safetyScore = 70;
  let scoreComment = "수면 환경을 분석했어요";
  
  try {
    const parsed = JSON.parse(analysis.summary);
    safetyScore = parsed.safetyScore || 70;
    scoreComment = parsed.scoreComment || scoreComment;
  } catch {
    // JSON이 아니면 기본값 사용
  }

  // 위험도 카운트
  const highCount = feedbackItems?.filter(i => i.risk_level === "High").length || 0;
  const mediumCount = feedbackItems?.filter(i => i.risk_level === "Medium").length || 0;
  const lowCount = feedbackItems?.filter(i => i.risk_level === "Low" || i.risk_level === "Info").length || 0;

  // URL 파라미터
  const url = new URL(request.url);
  const style = url.searchParams.get("style") || "square";

  const scoreColor = getScoreColor(safetyScore);
  const scoreGrade = getScoreGrade(safetyScore);
  const stars = getStars(safetyScore);
  const analysisDate = new Date(analysis.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 이미지 크기
  const width = 1080;
  const height = style === "vertical" ? 1350 : 1080;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: '"Noto Sans KR", sans-serif',
          padding: "60px",
        }}
      >
        {/* 배경 장식 */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: scoreColor,
            opacity: 0.05,
          }}
        />

        {/* 상단 브랜드 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div style={{ fontSize: "42px", color: "#ffffff", fontWeight: "bold" }}>
            🌙 AI 수면 환경 분석
          </div>
          <div style={{ fontSize: "24px", color: "#94a3b8", marginTop: "10px" }}>
            썬데이허그 | {analysisDate}
          </div>
        </div>

        {/* 메인 카드 */}
        <div
          style={{
            display: "flex",
            flexDirection: style === "vertical" ? "column" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "60px",
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "40px",
            padding: "60px",
            width: "90%",
          }}
        >
          {/* 점수 원형 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "280px",
              height: "280px",
              borderRadius: "50%",
              border: `16px solid ${scoreColor}`,
              boxShadow: `0 0 40px ${scoreColor}40`,
            }}
          >
            <div style={{ fontSize: "120px", fontWeight: "bold", color: "#ffffff" }}>
              {safetyScore}
            </div>
            <div style={{ fontSize: "28px", color: "#94a3b8" }}>/ 100점</div>
          </div>

          {/* 정보 영역 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: style === "vertical" ? "center" : "flex-start",
              gap: "20px",
            }}
          >
            {/* 별점 */}
            <div style={{ fontSize: "48px" }}>{stars}</div>

            {/* 등급 */}
            <div style={{ fontSize: "48px", fontWeight: "bold", color: "#ffffff" }}>
              {scoreGrade}
            </div>

            {/* 코멘트 */}
            <div
              style={{
                fontSize: "26px",
                color: "#cbd5e1",
                maxWidth: "400px",
                textAlign: style === "vertical" ? "center" : "left",
              }}
            >
              {scoreComment.slice(0, 30)}
              {scoreComment.length > 30 ? "..." : ""}
            </div>

            {/* 분석 항목 */}
            <div style={{ display: "flex", gap: "16px", marginTop: "20px" }}>
              <div
                style={{
                  padding: "12px 24px",
                  borderRadius: "30px",
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                  fontSize: "24px",
                  fontWeight: "600",
                }}
              >
                🚨 위험 {highCount}개
              </div>
              <div
                style={{
                  padding: "12px 24px",
                  borderRadius: "30px",
                  background: "rgba(249, 115, 22, 0.2)",
                  color: "#f97316",
                  fontSize: "24px",
                  fontWeight: "600",
                }}
              >
                ⚠️ 주의 {mediumCount}개
              </div>
              <div
                style={{
                  padding: "12px 24px",
                  borderRadius: "30px",
                  background: "rgba(34, 197, 94, 0.2)",
                  color: "#22c55e",
                  fontSize: "24px",
                  fontWeight: "600",
                }}
              >
                ✅ 양호 {lowCount}개
              </div>
            </div>
          </div>
        </div>

        {/* 하단 CTA */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "50px",
            padding: "30px 60px",
            borderRadius: "60px",
            background: "rgba(255, 107, 53, 0.15)",
          }}
        >
          <div style={{ fontSize: "32px", fontWeight: "600", color: "#ffffff" }}>
            📱 나도 무료로 분석 받아보기
          </div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#FF6B35", marginTop: "10px" }}>
            app.sundayhug.kr/customer/sleep
          </div>
        </div>

        {/* 하단 브랜드 */}
        <div style={{ fontSize: "22px", color: "#64748b", marginTop: "40px" }}>
          Powered by 썬데이허그 AI • 안전한 아기 수면을 위해
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        {
          name: "Noto Sans KR",
          data: await fetch(
            "https://fonts.gstatic.com/s/notosanskr/v27/PbykFmXiEBPT4ITbgNA5Cgm203Tq4JJWq209pU0DPdWuqxJFA4GNDCBYtw.ttf"
          ).then((res) => res.arrayBuffer()),
          weight: 400,
          style: "normal",
        },
        {
          name: "Noto Sans KR",
          data: await fetch(
            "https://fonts.gstatic.com/s/notosanskr/v27/PbykFmXiEBPT4ITbgNA5Cgm203Tq4JJWq209pU0DPdWuqxJFA4GNDCBYtw.ttf"
          ).then((res) => res.arrayBuffer()),
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}

