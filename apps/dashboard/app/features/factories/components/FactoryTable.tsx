/**
 * 공장 목록 테이블
 */

import { Link } from "react-router";
import {
  PhoneIcon,
  MailIcon,
  PencilIcon,
  TrashIcon,
  DollarSignIcon,
} from "lucide-react";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";

import type { Factory } from "../lib/factories.shared";

interface FactoryTableProps {
  factories: Factory[];
  onEdit: (factory: Factory) => void;
  onDelete: (factory: Factory) => void;
}

export function FactoryTable({
  factories,
  onEdit,
  onDelete,
}: FactoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>공장코드</TableHead>
          <TableHead>공장명</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead>주소</TableHead>
          <TableHead>상태</TableHead>
          <TableHead className="w-[100px]">액션</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {factories.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              등록된 공장이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          factories.map((factory) => (
            <TableRow key={factory.id}>
              <TableCell className="font-mono text-sm">
                {factory.factory_code}
              </TableCell>
              <TableCell className="font-medium">
                {factory.factory_name}
              </TableCell>
              <TableCell>{factory.contact_name || "-"}</TableCell>
              <TableCell>
                {factory.contact_phone && (
                  <div className="flex items-center gap-1 text-sm">
                    <PhoneIcon className="w-3 h-3" />
                    {factory.contact_phone}
                  </div>
                )}
                {factory.contact_email && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MailIcon className="w-3 h-3" />
                    {factory.contact_email}
                  </div>
                )}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {factory.address || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={factory.is_active ? "default" : "secondary"}>
                  {factory.is_active ? "활성" : "비활성"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    title="제조원가 관리"
                  >
                    <Link to={`/dashboard/factories/${factory.id}/costs`}>
                      <DollarSignIcon className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(factory)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(factory)}
                  >
                    <TrashIcon className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
