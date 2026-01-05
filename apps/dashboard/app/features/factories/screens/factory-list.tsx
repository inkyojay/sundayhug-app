/**
 * 공장 관리 - 공장 목록
 */
import type { Route } from "./+types/factory-list";

import {
  FactoryIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";

import makeServerClient from "~/core/lib/supa-client.server";

import {
  getFactories,
  parseFactoryQueryParams,
  createFactory,
  updateFactory,
  deleteFactory,
  extractFactoryFormData,
} from "../lib/factories.server";
import type { Factory, FactoryFormData } from "../lib/factories.shared";
import { EMPTY_FACTORY_FORM, factoryToFormData } from "../lib/factories.shared";
import { FactoryFormDialog, FactoryDeleteDialog, FactoryTable } from "../components";

export const meta: Route.MetaFunction = () => {
  return [{ title: `공장 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const url = new URL(request.url);
  const params = parseFactoryQueryParams(url);

  const factories = await getFactories(supabase, params);

  return { factories, search: params.search };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const factoryData = extractFactoryFormData(formData);
    return createFactory(supabase, factoryData);
  }

  if (intent === "update") {
    const id = formData.get("id") as string;
    const factoryData = extractFactoryFormData(formData);
    return updateFactory(supabase, id, factoryData);
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    return deleteFactory(supabase, id);
  }

  return { error: "Unknown action" };
}

export default function FactoryList({ loaderData }: Route.ComponentProps) {
  const { factories, search } = loaderData;
  const fetcher = useFetcher();

  const [searchTerm, setSearchTerm] = useState(search);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
  const [formData, setFormData] = useState<FactoryFormData>(EMPTY_FACTORY_FORM);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    window.location.href = `/dashboard/factories?${params.toString()}`;
  };

  const openCreateDialog = () => {
    setSelectedFactory(null);
    setFormData(EMPTY_FACTORY_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (factory: Factory) => {
    setSelectedFactory(factory);
    setFormData(factoryToFormData(factory));
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (factory: Factory) => {
    setSelectedFactory(factory);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    const form = new FormData();
    form.append("intent", selectedFactory ? "update" : "create");
    if (selectedFactory) form.append("id", selectedFactory.id);
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, String(value));
    });

    fetcher.submit(form, { method: "post" });
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (!selectedFactory) return;
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", selectedFactory.id);
    fetcher.submit(form, { method: "post" });
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FactoryIcon className="w-6 h-6" />
            공장 관리
          </h1>
          <p className="text-muted-foreground">
            제품을 제조하는 공장을 관리합니다.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="w-4 h-4 mr-2" />
          공장 등록
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="공장명 또는 코드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              검색
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FactoryTable
            factories={factories}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </CardContent>
      </Card>

      <FactoryFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedFactory={selectedFactory}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
      />

      <FactoryDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        factory={selectedFactory}
        onConfirm={handleDelete}
      />
    </div>
  );
}
