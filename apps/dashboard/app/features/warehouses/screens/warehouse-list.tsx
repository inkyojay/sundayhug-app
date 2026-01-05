/**
 * 창고 관리 - 창고 목록
 */
import type { Route } from "./+types/warehouse-list";

import { PlusIcon, SearchIcon, WarehouseIcon } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardHeader } from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

import makeServerClient from "~/core/lib/supa-client.server";

import {
  WarehouseDeleteDialog,
  WarehouseFormDialog,
  WarehouseTable,
} from "../components";
import {
  createWarehouse,
  deleteWarehouse,
  extractWarehouseFormData,
  getWarehouseInventoryCounts,
  getWarehouses,
  parseWarehouseQueryParams,
  updateWarehouse,
} from "../lib/warehouses.server";
import {
  EMPTY_WAREHOUSE_FORM,
  WAREHOUSE_TYPES,
  warehouseToFormData,
  type Warehouse,
  type WarehouseFormData,
} from "../lib/warehouses.shared";

export const meta: Route.MetaFunction = () => {
  return [{ title: `창고 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const url = new URL(request.url);
  const params = parseWarehouseQueryParams(url);

  const warehouses = await getWarehouses(supabase, params);
  const inventoryCounts = await getWarehouseInventoryCounts(supabase, warehouses);

  return {
    warehouses,
    search: params.search,
    typeFilter: params.typeFilter,
    inventoryCounts,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const data = extractWarehouseFormData(formData);
    return createWarehouse(supabase, data);
  }

  if (intent === "update") {
    const id = formData.get("id") as string;
    const data = extractWarehouseFormData(formData);
    return updateWarehouse(supabase, id, data);
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    return deleteWarehouse(supabase, id);
  }

  return { error: "Unknown action" };
}

export default function WarehouseList({
  loaderData,
}: Route.ComponentProps) {
  const { warehouses, search, typeFilter, inventoryCounts } = loaderData;
  const fetcher = useFetcher();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedType, setSelectedType] = useState(typeFilter);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null
  );
  const [formData, setFormData] = useState<WarehouseFormData>(EMPTY_WAREHOUSE_FORM);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedType) params.set("type", selectedType);
    window.location.href = `/dashboard/warehouses?${params.toString()}`;
  };

  const openCreateDialog = () => {
    setSelectedWarehouse(null);
    setFormData(EMPTY_WAREHOUSE_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData(warehouseToFormData(warehouse));
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    const form = new FormData();
    form.append("intent", selectedWarehouse ? "update" : "create");
    if (selectedWarehouse) form.append("id", selectedWarehouse.id);
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, String(value));
    });

    fetcher.submit(form, { method: "post" });
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (!selectedWarehouse) return;
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", selectedWarehouse.id);
    fetcher.submit(form, { method: "post" });
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6" />
            창고 관리
          </h1>
          <p className="text-muted-foreground">
            자체 창고 및 3PL 물류센터를 관리합니다.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="w-4 h-4 mr-2" />
          창고 등록
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="창고명 또는 코드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="유형 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">전체</SelectItem>
                {WAREHOUSE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              검색
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <WarehouseTable
            warehouses={warehouses}
            inventoryCounts={inventoryCounts}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </CardContent>
      </Card>

      <WarehouseFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
        isEditing={!!selectedWarehouse}
      />

      <WarehouseDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        warehouse={selectedWarehouse}
        onConfirm={handleDelete}
      />
    </div>
  );
}
