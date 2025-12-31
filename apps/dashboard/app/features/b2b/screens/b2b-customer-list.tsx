/**
 * B2B 업체 목록
 */
import type { Route } from "./+types/b2b-customer-list";

import {
  BuildingIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PencilIcon,
  DollarSignIcon,
  Trash2Icon,
  GlobeIcon,
  MapPinIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useFetcher, useRevalidator } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/core/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/core/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: "B2B 업체 관리 | Sundayhug Admin" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const businessType = url.searchParams.get("type") || "all";
  const status = url.searchParams.get("status") || "active";

  // 업체 목록 조회
  let query = supabase
    .from("b2b_customers")
    .select("*", { count: "exact" })
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  // 검색
  if (search) {
    query = query.or(
      `company_name.ilike.%${search}%,customer_code.ilike.%${search}%,contact_name.ilike.%${search}%`
    );
  }

  // 업체 유형 필터
  if (businessType !== "all") {
    query = query.eq("business_type", businessType);
  }

  // 상태 필터
  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data: customers, count, error } = await query;

  // 통계
  const { data: allCustomers } = await supabase
    .from("b2b_customers")
    .select("business_type, is_active")
    .eq("is_deleted", false);

  const stats = {
    total: allCustomers?.length || 0,
    domestic: allCustomers?.filter((c) => c.business_type === "domestic").length || 0,
    overseas: allCustomers?.filter((c) => c.business_type === "overseas").length || 0,
    active: allCustomers?.filter((c) => c.is_active).length || 0,
  };

  return {
    customers: customers || [],
    count: count || 0,
    stats,
    search,
    businessType,
    status,
    error: error?.message,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    const id = formData.get("id") as string;

    const { error } = await supabase
      .from("b2b_customers")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "업체가 삭제되었습니다." };
  }

  if (intent === "toggle_status") {
    const id = formData.get("id") as string;
    const is_active = formData.get("is_active") === "true";

    const { error } = await supabase
      .from("b2b_customers")
      .update({
        is_active: !is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: is_active ? "비활성화되었습니다." : "활성화되었습니다." };
  }

  return { success: false, error: "Unknown intent" };
}

export default function B2BCustomerList({ loaderData }: Route.ComponentProps) {
  const { customers, count, stats, search, businessType, status, error } = loaderData;

  const [searchInput, setSearchInput] = useState(search);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<any | null>(null);

  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setMessage(`✅ ${fetcher.data.message}`);
        revalidator.revalidate();
      } else {
        setMessage(`❌ ${fetcher.data.error}`);
      }
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetcher.data, fetcher.state]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput) params.set("search", searchInput);
    if (businessType !== "all") params.set("type", businessType);
    if (status !== "active") params.set("status", status);
    window.location.href = `/dashboard/b2b/customers${params.toString() ? `?${params}` : ""}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (key === "type") {
      if (value !== "all") params.set("type", value);
      if (status !== "active") params.set("status", status);
    } else if (key === "status") {
      if (businessType !== "all") params.set("type", businessType);
      if (value !== "all") params.set("status", value);
    }
    window.location.href = `/dashboard/b2b/customers${params.toString() ? `?${params}` : ""}`;
  };

  const handleDelete = () => {
    if (!deleteCustomer) return;
    fetcher.submit(
      { intent: "delete", id: deleteCustomer.id },
      { method: "POST" }
    );
    setDeleteCustomer(null);
  };

  const handleToggleStatus = (customer: any) => {
    fetcher.submit(
      { intent: "toggle_status", id: customer.id, is_active: String(customer.is_active) },
      { method: "POST" }
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.startsWith("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>업체 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteCustomer?.company_name}" 업체를 삭제하시겠습니까?
              <br />
              삭제된 업체는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BuildingIcon className="h-6 w-6" />
            B2B 업체 관리
          </h1>
          <p className="text-gray-500">
            등록된 업체 {stats.total}개 (국내 {stats.domestic} / 해외 {stats.overseas})
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/b2b/customers/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            업체 등록
          </Link>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">전체 업체</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.domestic}</div>
            <div className="text-sm text-gray-500">국내 업체</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.overseas}</div>
            <div className="text-sm text-gray-500">해외 업체</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.active}</div>
            <div className="text-sm text-gray-500">활성 업체</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="업체명, 코드, 담당자로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>

          <div className="flex gap-3 items-center">
            <FilterIcon className="h-4 w-4 text-gray-400" />
            <Select value={businessType} onValueChange={(v) => handleFilterChange("type", v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="업체 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="domestic">국내</SelectItem>
                <SelectItem value="overseas">해외</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => handleFilterChange("status", v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 업체 목록 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">업체 코드</TableHead>
                <TableHead>회사명</TableHead>
                <TableHead className="w-[80px]">유형</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>결제조건</TableHead>
                <TableHead className="w-[80px]">상태</TableHead>
                <TableHead className="w-[80px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                    등록된 업체가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {customer.customer_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{customer.company_name}</div>
                      {customer.company_name_en && (
                        <div className="text-xs text-gray-500">{customer.company_name_en}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.business_type === "domestic" ? "default" : "secondary"}>
                        {customer.business_type === "domestic" ? (
                          <><MapPinIcon className="h-3 w-3 mr-1" />국내</>
                        ) : (
                          <><GlobeIcon className="h-3 w-3 mr-1" />해외</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.contact_name || "-"}</TableCell>
                    <TableCell>
                      <div className="text-sm">{customer.contact_phone || "-"}</div>
                      {customer.contact_email && (
                        <div className="text-xs text-gray-500">{customer.contact_email}</div>
                      )}
                    </TableCell>
                    <TableCell>{customer.payment_terms || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={customer.is_active ? "default" : "secondary"}>
                        {customer.is_active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/dashboard/b2b/customers/${customer.id}`}>
                              <PencilIcon className="h-4 w-4 mr-2" />
                              수정
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/dashboard/b2b/customers/${customer.id}/prices`}>
                              <DollarSignIcon className="h-4 w-4 mr-2" />
                              가격표
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(customer)}>
                            {customer.is_active ? "비활성화" : "활성화"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteCustomer(customer)}
                          >
                            <Trash2Icon className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
