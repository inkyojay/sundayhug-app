/**
 * 대시보드 - 상담 지식 관리
 */
import type { Route } from "./+types/knowledge-list";

import { Link, useLoaderData, data, useFetcher } from "react-router";
import { 
  Plus, 
  Upload,
  Trash2, 
  Search,
  BookOpen,
  Moon,
  Utensils,
  Baby,
  Heart,
  Stethoscope,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useState, useRef } from "react";

import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import { Input } from "~/core/components/ui/input";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [{ title: "상담 지식 관리 | 대시보드" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const { data: knowledge, error } = await supabase
    .from("chat_knowledge")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("지식 조회 오류:", error);
  }

  // 통계
  const stats = {
    total: knowledge?.length || 0,
    byTopic: {
      sleep: knowledge?.filter(k => k.topic === "sleep").length || 0,
      feeding: knowledge?.filter(k => k.topic === "feeding").length || 0,
      development: knowledge?.filter(k => k.topic === "development").length || 0,
      health: knowledge?.filter(k => k.topic === "health").length || 0,
      emotion: knowledge?.filter(k => k.topic === "emotion").length || 0,
    },
    verified: knowledge?.filter(k => k.verified).length || 0,
  };

  return data({ knowledge: knowledge || [], stats });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "delete") {
    const id = formData.get("id") as string;
    const { error } = await supabase
      .from("chat_knowledge")
      .delete()
      .eq("id", id);

    if (error) {
      return data({ success: false, error: "삭제 실패" });
    }
    return data({ success: true });
  }

  if (actionType === "upload-csv") {
    const csvContent = formData.get("csvContent") as string;
    
    if (!csvContent) {
      return data({ success: false, error: "CSV 내용이 없습니다." });
    }

    try {
      // CSV 파싱
      const lines = csvContent.split("\n");
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      
      const records: Array<{
        topic: string;
        age_range: string;
        question: string;
        answer: string;
        source_name: string;
        source_url?: string;
        tags?: string[];
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV 파싱 (큰따옴표 안의 쉼표 처리)
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ""));
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ""));

        // 헤더와 매핑
        const record: Record<string, string> = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx] || "";
        });

        // 필수 필드 확인
        if (!record.topic || !record.age_range || !record.question || !record.answer || !record.source_name) {
          continue;
        }

        records.push({
          topic: record.topic,
          age_range: record.age_range,
          question: record.question,
          answer: record.answer,
          source_name: record.source_name,
          source_url: record.source_url || undefined,
          tags: record.tags ? record.tags.split(",").map(t => t.trim()) : undefined,
        });
      }

      if (records.length === 0) {
        return data({ success: false, error: "유효한 데이터가 없습니다." });
      }

      // DB에 삽입
      const { error } = await supabase
        .from("chat_knowledge")
        .insert(records);

      if (error) {
        console.error("CSV 업로드 오류:", error);
        return data({ success: false, error: `업로드 실패: ${error.message}` });
      }

      return data({ success: true, count: records.length });
    } catch (error) {
      console.error("CSV 파싱 오류:", error);
      return data({ success: false, error: "CSV 파싱에 실패했습니다." });
    }
  }

  if (actionType === "toggle-verified") {
    const id = formData.get("id") as string;
    const verified = formData.get("verified") === "true";
    
    const { error } = await supabase
      .from("chat_knowledge")
      .update({ verified: !verified })
      .eq("id", id);

    if (error) {
      return data({ success: false, error: "상태 변경 실패" });
    }
    return data({ success: true });
  }

  return data({ success: false, error: "잘못된 요청" });
}

// 주제 아이콘
const topicIcons: Record<string, typeof Moon> = {
  sleep: Moon,
  feeding: Utensils,
  development: Baby,
  health: Stethoscope,
  emotion: Heart,
  general: BookOpen,
};

// 주제 이름
const topicNames: Record<string, string> = {
  sleep: "수면",
  feeding: "수유",
  development: "발달",
  health: "건강",
  emotion: "정서",
  general: "일반",
};

// 주제 색상
const topicColors: Record<string, string> = {
  sleep: "bg-indigo-100 text-indigo-700",
  feeding: "bg-orange-100 text-orange-700",
  development: "bg-green-100 text-green-700",
  health: "bg-red-100 text-red-700",
  emotion: "bg-pink-100 text-pink-700",
  general: "bg-gray-100 text-gray-700",
};

export default function KnowledgeListScreen() {
  const { knowledge, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredKnowledge = knowledge.filter(k => {
    const matchesSearch = k.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          k.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = !filterTopic || k.topic === filterTopic;
    return matchesSearch && matchesTopic;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvContent = event.target?.result as string;
      fetcher.submit(
        { actionType: "upload-csv", csvContent },
        { method: "post" }
      );
    };
    reader.readAsText(file, "UTF-8");
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: string, question: string) => {
    if (confirm(`"${question.slice(0, 30)}..." 지식을 삭제하시겠습니까?`)) {
      fetcher.submit(
        { actionType: "delete", id },
        { method: "post" }
      );
    }
  };

  const handleToggleVerified = (id: string, verified: boolean) => {
    fetcher.submit(
      { actionType: "toggle-verified", id, verified: String(verified) },
      { method: "post" }
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">상담 지식 관리</h1>
          <p className="text-muted-foreground">AI 상담에 사용되는 지식 베이스</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            CSV 업로드
          </Button>
          <Button asChild>
            <Link to="/dashboard/chat/knowledge/new">
              <Plus className="w-4 h-4 mr-2" />
              지식 추가
            </Link>
          </Button>
        </div>
      </div>

      {/* Upload Result */}
      {fetcher.data && (
        <div className={`mb-4 p-4 rounded-lg ${fetcher.data.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {fetcher.data.success 
            ? `✅ ${fetcher.data.count || 1}개 지식이 추가되었습니다.`
            : `❌ ${fetcher.data.error}`
          }
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div 
          className={`bg-card p-4 rounded-lg border cursor-pointer ${!filterTopic ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterTopic(null)}
        >
          <p className="text-sm text-muted-foreground">전체</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        {Object.entries(topicNames).filter(([k]) => k !== "general").map(([key, name]) => {
          const Icon = topicIcons[key];
          const count = stats.byTopic[key as keyof typeof stats.byTopic] || 0;
          return (
            <div 
              key={key}
              className={`bg-card p-4 rounded-lg border cursor-pointer ${filterTopic === key ? "ring-2 ring-primary" : ""}`}
              onClick={() => setFilterTopic(filterTopic === key ? null : key)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{name}</p>
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">검증됨</p>
          <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="질문 또는 답변 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Knowledge List */}
      <div className="bg-card rounded-lg border">
        {filteredKnowledge.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterTopic ? "검색 결과가 없습니다" : "등록된 지식이 없습니다"}
            </p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              CSV 파일로 업로드
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredKnowledge.map((k) => {
              const Icon = topicIcons[k.topic] || BookOpen;
              return (
                <div key={k.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${topicColors[k.topic] || topicColors.general}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {topicNames[k.topic] || "일반"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {k.age_range}
                        </Badge>
                        {k.verified && (
                          <Badge className="text-xs bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            검증됨
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium mb-1 line-clamp-1">{k.question}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{k.answer}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        출처: {k.source_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleVerified(k.id, k.verified)}
                        title={k.verified ? "검증 해제" : "검증 처리"}
                      >
                        {k.verified ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(k.id, k.question)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}






