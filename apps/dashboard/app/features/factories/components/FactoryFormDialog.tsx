/**
 * 공장 등록/수정 다이얼로그
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
import { Textarea } from "~/core/components/ui/textarea";
import { Switch } from "~/core/components/ui/switch";

import type { Factory, FactoryFormData } from "../lib/factories.shared";
import { isValidFactoryForm } from "../lib/factories.shared";

interface FactoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFactory: Factory | null;
  formData: FactoryFormData;
  onFormDataChange: (data: FactoryFormData) => void;
  onSubmit: () => void;
}

export function FactoryFormDialog({
  open,
  onOpenChange,
  selectedFactory,
  formData,
  onFormDataChange,
  onSubmit,
}: FactoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedFactory ? "공장 정보 수정" : "공장 등록"}
          </DialogTitle>
          <DialogDescription>
            공장 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="factory_code">공장 코드 *</Label>
              <Input
                id="factory_code"
                value={formData.factory_code}
                onChange={(e) => onFormDataChange({ ...formData, factory_code: e.target.value })}
                placeholder="예: FC001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factory_name">공장명 *</Label>
              <Input
                id="factory_name"
                value={formData.factory_name}
                onChange={(e) => onFormDataChange({ ...formData, factory_name: e.target.value })}
                placeholder="예: 썬데이허그 제1공장"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">담당자명</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => onFormDataChange({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">연락처</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => onFormDataChange({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">이메일</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => onFormDataChange({ ...formData, contact_email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">비고</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => onFormDataChange({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">활성화</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={onSubmit} disabled={!isValidFactoryForm(formData)}>
            {selectedFactory ? "수정" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
