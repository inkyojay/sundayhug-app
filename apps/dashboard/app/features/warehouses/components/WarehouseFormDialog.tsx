/**
 * 창고 등록/수정 다이얼로그 컴포넌트
 */

import { Button } from "~/core/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { Switch } from "~/core/components/ui/switch";
import { Textarea } from "~/core/components/ui/textarea";

import {
  type WarehouseFormData,
  WAREHOUSE_TYPES,
  isValidWarehouseForm,
} from "../lib/warehouses.shared";

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: WarehouseFormData;
  onFormDataChange: (data: WarehouseFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  isEditing,
}: WarehouseFormDialogProps) {
  const handleChange = <K extends keyof WarehouseFormData>(
    key: K,
    value: WarehouseFormData[K]
  ) => {
    onFormDataChange({ ...formData, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "창고 정보 수정" : "창고 등록"}
          </DialogTitle>
          <DialogDescription>창고 정보를 입력해주세요.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warehouse_code">창고 코드 *</Label>
              <Input
                id="warehouse_code"
                value={formData.warehouse_code}
                onChange={(e) => handleChange("warehouse_code", e.target.value)}
                placeholder="예: WH001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse_name">창고명 *</Label>
              <Input
                id="warehouse_name"
                value={formData.warehouse_name}
                onChange={(e) => handleChange("warehouse_name", e.target.value)}
                placeholder="예: 본사 창고"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warehouse_type">창고 유형 *</Label>
              <Select
                value={formData.warehouse_type}
                onValueChange={(value) => handleChange("warehouse_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WAREHOUSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">위치</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="예: 서울"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">담당자명</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleChange("contact_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">연락처</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => handleChange("contact_phone", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">비고</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange("is_active", checked)}
            />
            <Label htmlFor="is_active">활성화</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!isValidWarehouseForm(formData)}
          >
            {isEditing ? "수정" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
