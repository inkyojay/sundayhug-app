/**
 * Analysis Result Component
 *
 * Displays the sleep environment analysis results with interactive pins on the image.
 */
import { ChevronDown, Download, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/core/components/ui/collapsible";
import { cn } from "~/core/lib/utils";

import type { AnalysisReport, RiskLevel } from "../schema";
import { getRiskColorClasses, getRiskIcon } from "./icons";

interface AnalysisResultProps {
  report: AnalysisReport;
  imagePreview: string;
  analysisId?: string;
  onReset: () => void;
  onDownloadSlides?: () => void;
  isDownloading?: boolean;
}

export function AnalysisResult({
  report,
  imagePreview,
  analysisId,
  onReset,
  onDownloadSlides,
  isDownloading = false,
}: AnalysisResultProps) {
  const [activeFeedbackId, setActiveFeedbackId] = useState<number | null>(null);
  const [referencesOpen, setReferencesOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button onClick={onReset} variant="secondary">
          <RefreshCw className="mr-2 h-4 w-4" />
          새로 분석하기
        </Button>

        {onDownloadSlides && (
          <Button onClick={onDownloadSlides} disabled={isDownloading}>
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? "슬라이드 생성 중..." : "📸 인스타그램 슬라이드 다운로드"}
          </Button>
        )}

        {analysisId && (
          <span className="text-muted-foreground text-sm">
            ✓ 데이터 저장 완료 (ID: {analysisId.substring(0, 8)}...)
          </span>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image with Pins */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative inline-block w-full">
              <img
                src={imagePreview}
                alt="분석된 수면 환경"
                className="block h-auto w-full rounded-lg"
              />

              {/* Risk Pins */}
              {report.feedbackItems.map((item) => {
                const colors = getRiskColorClasses(item.riskLevel as RiskLevel);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-sm font-bold text-white transition-all duration-300",
                      colors.pin,
                      activeFeedbackId === item.id
                        ? "scale-150 ring-4 ring-white"
                        : "scale-100"
                    )}
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                    onMouseEnter={() => setActiveFeedbackId(item.id)}
                    onMouseLeave={() => setActiveFeedbackId(null)}
                    title={item.title}
                  >
                    {item.id}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Report */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>분석 리포트</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="bg-muted mb-6 rounded-lg p-4">
                <h3 className="mb-2 font-bold">종합 요약</h3>
                <p className="text-muted-foreground">{report.summary}</p>
              </div>

              {/* Feedback Items */}
              <div className="space-y-4">
                {report.feedbackItems.map((item) => {
                  const colors = getRiskColorClasses(item.riskLevel as RiskLevel);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-r-lg border-l-4 p-4 transition-all",
                        colors.bg,
                        colors.border,
                        activeFeedbackId === item.id && "ring-2 ring-primary"
                      )}
                      onMouseEnter={() => setActiveFeedbackId(item.id)}
                      onMouseLeave={() => setActiveFeedbackId(null)}
                    >
                      <div className="mb-2 flex items-center">
                        <span className={cn("mr-3", colors.text)}>
                          {getRiskIcon(item.riskLevel as RiskLevel, "h-6 w-6")}
                        </span>
                        <h4 className={cn("font-bold", colors.text)}>
                          {item.id}. {item.title} ({item.riskLevel})
                        </h4>
                      </div>
                      <p className={cn("text-sm", colors.text)}>{item.feedback}</p>
                    </div>
                  );
                })}
              </div>

              {/* References */}
              {report.references && report.references.length > 0 && (
                <Collapsible
                  open={referencesOpen}
                  onOpenChange={setReferencesOpen}
                  className="mt-8 border-t pt-6"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex w-full items-center justify-between p-0"
                    >
                      <h3 className="font-bold">참고 자료</h3>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 transition-transform duration-300",
                          referencesOpen && "rotate-180"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-4 list-inside list-disc space-y-2 pl-2">
                      {report.references.map((ref, index) => (
                        <li key={index} className="text-sm">
                          <a
                            href={ref.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {ref.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



