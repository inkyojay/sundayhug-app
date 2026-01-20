/**
 * 재고 자동 할당 워크플로우 설정 다이얼로그
 *
 * 특정 시간에 창고 재고의 N%를 네이버 재고로 자동 푸시하는 스케줄 설정
 */

import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Clock, Play, Pause, Trash2, Plus, RefreshCw, History } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Checkbox } from "~/core/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Badge } from "~/core/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/core/components/ui/alert-dialog";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  schedule_type: "daily" | "weekly" | "custom";
  schedule_time: string;
  schedule_days: number[] | null;
  allocation_percent: number;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_message: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowLog {
  id: string;
  workflow_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  options_updated: number;
  options_failed: number;
  error_message: string | null;
}

interface WorkflowSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflows: Workflow[];
  workflowLogs: WorkflowLog[];
  onRefresh: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "일" },
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
];

export function WorkflowSettingsDialog({
  open,
  onOpenChange,
  workflows,
  workflowLogs,
  onRefresh,
}: WorkflowSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<"list" | "create" | "logs">("list");
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  // 새 워크플로우 폼 상태
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formScheduleType, setFormScheduleType] = useState<"daily" | "weekly">("daily");
  const [formScheduleTime, setFormScheduleTime] = useState("09:00");
  const [formScheduleDays, setFormScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]); // 월~금
  const [formAllocationPercent, setFormAllocationPercent] = useState("100");

  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";

  // 폼 초기화
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormScheduleType("daily");
    setFormScheduleTime("09:00");
    setFormScheduleDays([1, 2, 3, 4, 5]);
    setFormAllocationPercent("100");
    setEditingWorkflow(null);
  };

  // 편집 모드로 전환
  const startEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setFormName(workflow.name);
    setFormDescription(workflow.description || "");
    setFormScheduleType(workflow.schedule_type === "custom" ? "daily" : workflow.schedule_type);
    setFormScheduleTime(workflow.schedule_time);
    setFormScheduleDays(workflow.schedule_days || [1, 2, 3, 4, 5]);
    setFormAllocationPercent(String(workflow.allocation_percent));
    setActiveTab("create");
  };

  // 워크플로우 저장
  const handleSave = () => {
    const formData = new FormData();
    formData.append("action", editingWorkflow ? "update_workflow" : "create_workflow");
    if (editingWorkflow) {
      formData.append("workflowId", editingWorkflow.id);
    }
    formData.append("name", formName);
    formData.append("description", formDescription);
    formData.append("scheduleType", formScheduleType);
    formData.append("scheduleTime", formScheduleTime);
    if (formScheduleType === "weekly") {
      formData.append("scheduleDays", JSON.stringify(formScheduleDays));
    }
    formData.append("allocationPercent", formAllocationPercent);

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/integrations/naver/workflows",
    });
  };

  // 워크플로우 활성화/비활성화
  const toggleWorkflow = (workflow: Workflow) => {
    const formData = new FormData();
    formData.append("action", "toggle_workflow");
    formData.append("workflowId", workflow.id);
    formData.append("isActive", String(!workflow.is_active));

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/integrations/naver/workflows",
    });
  };

  // 워크플로우 삭제
  const deleteWorkflow = (workflowId: string) => {
    const formData = new FormData();
    formData.append("action", "delete_workflow");
    formData.append("workflowId", workflowId);

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/integrations/naver/workflows",
    });
  };

  // 워크플로우 수동 실행
  const runWorkflow = (workflowId: string) => {
    const formData = new FormData();
    formData.append("action", "run_workflow");
    formData.append("workflowId", workflowId);

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/integrations/naver/workflows",
    });
  };

  // fetcher 결과 처리
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as any;
      if (data.success) {
        if (activeTab === "create") {
          resetForm();
          setActiveTab("list");
        }
        onRefresh();
      }
    }
  }, [fetcher.state, fetcher.data, activeTab, onRefresh]);

  // 요일 토글
  const toggleDay = (day: number) => {
    if (formScheduleDays.includes(day)) {
      setFormScheduleDays(formScheduleDays.filter((d) => d !== day));
    } else {
      setFormScheduleDays([...formScheduleDays, day].sort());
    }
  };

  // 시간 포맷
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  // 날짜 포맷
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 스케줄 설명 생성
  const getScheduleDescription = (workflow: Workflow) => {
    if (workflow.schedule_type === "daily") {
      return `매일 ${formatTime(workflow.schedule_time)}`;
    } else if (workflow.schedule_type === "weekly" && workflow.schedule_days) {
      const days = workflow.schedule_days.map((d) => DAYS_OF_WEEK[d].label).join(", ");
      return `매주 ${days} ${formatTime(workflow.schedule_time)}`;
    }
    return workflow.schedule_time;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            재고 자동 할당 워크플로우
          </DialogTitle>
          <DialogDescription>
            특정 시간에 창고 재고의 비율로 네이버 재고를 자동 할당합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">워크플로우 목록</TabsTrigger>
            <TabsTrigger value="create">{editingWorkflow ? "수정" : "새로 만들기"}</TabsTrigger>
            <TabsTrigger value="logs">실행 기록</TabsTrigger>
          </TabsList>

          {/* 워크플로우 목록 */}
          <TabsContent value="list" className="flex-1 overflow-auto">
            <div className="space-y-4">
              {workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>등록된 워크플로우가 없습니다.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("create")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    새 워크플로우 만들기
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>스케줄</TableHead>
                      <TableHead>비율</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>마지막 실행</TableHead>
                      <TableHead className="w-[150px]">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <div className="font-medium">{workflow.name}</div>
                          {workflow.description && (
                            <div className="text-xs text-muted-foreground">{workflow.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getScheduleDescription(workflow)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{workflow.allocation_percent}%</Badge>
                        </TableCell>
                        <TableCell>
                          {workflow.is_active ? (
                            <Badge className="bg-green-100 text-green-800">활성</Badge>
                          ) : (
                            <Badge variant="secondary">비활성</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {workflow.last_run_at ? (
                            <div>
                              <div>{formatDate(workflow.last_run_at)}</div>
                              {workflow.last_run_status === "success" ? (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">성공</Badge>
                              ) : workflow.last_run_status === "failed" ? (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700">실패</Badge>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => runWorkflow(workflow.id)}
                              disabled={isSubmitting}
                              title="지금 실행"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleWorkflow(workflow)}
                              disabled={isSubmitting}
                              title={workflow.is_active ? "비활성화" : "활성화"}
                            >
                              {workflow.is_active ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(workflow)}
                              title="수정"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="삭제">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>워크플로우 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{workflow.name}" 워크플로우를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteWorkflow(workflow.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* 새 워크플로우 / 수정 */}
          <TabsContent value="create" className="flex-1 overflow-auto">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">워크플로우 이름 *</Label>
                <Input
                  id="workflow-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 오전 9시 80% 재고 할당"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflow-desc">설명 (선택)</Label>
                <Input
                  id="workflow-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="워크플로우에 대한 설명"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>스케줄 타입</Label>
                  <Select
                    value={formScheduleType}
                    onValueChange={(v) => setFormScheduleType(v as "daily" | "weekly")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">매일</SelectItem>
                      <SelectItem value="weekly">매주 특정 요일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-time">실행 시간 (KST)</Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={formScheduleTime}
                    onChange={(e) => setFormScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              {formScheduleType === "weekly" && (
                <div className="space-y-2">
                  <Label>실행 요일</Label>
                  <div className="flex gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div
                        key={day.value}
                        className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer border-2 transition-colors ${
                          formScheduleDays.includes(day.value)
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:border-blue-300"
                        }`}
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="allocation-percent">할당 비율 (%)</Label>
                <div className="relative max-w-xs">
                  <Input
                    id="allocation-percent"
                    type="number"
                    min="0"
                    max="100"
                    value={formAllocationPercent}
                    onChange={(e) => setFormAllocationPercent(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  창고 재고의 {formAllocationPercent || 0}%가 네이버 재고로 설정됩니다.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting || !formName || !formScheduleTime}
                >
                  {isSubmitting ? "저장 중..." : editingWorkflow ? "수정" : "워크플로우 생성"}
                </Button>
                {editingWorkflow && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setActiveTab("list");
                    }}
                  >
                    취소
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 실행 기록 */}
          <TabsContent value="logs" className="flex-1 overflow-auto">
            <div className="space-y-4">
              {workflowLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>실행 기록이 없습니다.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>실행 시간</TableHead>
                      <TableHead>워크플로우</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>결과</TableHead>
                      <TableHead>완료 시간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflowLogs.map((log) => {
                      const workflow = workflows.find((w) => w.id === log.workflow_id);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {formatDate(log.started_at)}
                          </TableCell>
                          <TableCell>{workflow?.name || "-"}</TableCell>
                          <TableCell>
                            {log.status === "success" ? (
                              <Badge className="bg-green-100 text-green-800">성공</Badge>
                            ) : log.status === "failed" ? (
                              <Badge variant="destructive">실패</Badge>
                            ) : (
                              <Badge variant="secondary">실행중</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.status === "success" ? (
                              <span className="text-green-600">
                                {log.options_updated}개 옵션 업데이트
                              </span>
                            ) : log.error_message ? (
                              <span className="text-red-600 truncate max-w-[200px] block">
                                {log.error_message}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.completed_at ? formatDate(log.completed_at) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
