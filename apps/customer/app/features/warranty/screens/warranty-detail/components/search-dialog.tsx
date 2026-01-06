/**
 * Order Search Dialog Component
 */
import { SearchIcon, LinkIcon, Loader2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Badge } from "~/core/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import type { OrderInfo } from "../types";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  searchResults: OrderInfo[];
  onLinkOrder: (orderId: string) => void;
  isSubmitting: boolean;
  error?: string;
  hasSearched: boolean;
}

export function SearchDialog({
  open,
  onClose,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchResults,
  onLinkOrder,
  isSubmitting,
  error,
  hasSearched,
}: SearchDialogProps) {
  const { t } = useTranslation(["warranty", "common"]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("warranty:admin.warrantyDetail.searchDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("warranty:admin.warrantyDetail.searchDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t("warranty:admin.warrantyDetail.searchDialog.placeholder")}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
            <Button onClick={onSearch} disabled={isSubmitting || searchQuery.length < 3}>
              {isSubmitting ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {searchResults.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((order) => (
                <div
                  key={order.id}
                  className={`p-3 rounded-lg border text-sm ${
                    order.already_linked
                      ? "bg-muted/30 opacity-60"
                      : "bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{order.shop_sale_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.shop_name} · {t("warranty:admin.warrantyDetail.searchDialog.orderNumber")}: {order.shop_ord_no}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.ord_time
                          ? new Date(order.ord_time).toLocaleString("ko-KR")
                          : "-"}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span>{t("warranty:admin.warrantyDetail.searchDialog.recipient")}: {order.to_name}</span>
                        <span className="font-mono">{order.to_htel || order.to_tel}</span>
                      </div>
                      {order.invoice_no && (
                        <p className="text-xs font-mono mt-1">{t("warranty:admin.warrantyDetail.searchDialog.tracking")}: {order.invoice_no}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold mb-2">
                        {Number(order.pay_amt || 0).toLocaleString()}원
                      </p>
                      {order.already_linked ? (
                        <Badge variant="secondary" className="text-xs">
                          {t("warranty:admin.warrantyDetail.searchDialog.alreadyLinked")}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onLinkOrder(order.id)}
                          disabled={isSubmitting}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          {t("warranty:admin.warrantyDetail.searchDialog.link")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 3 && hasSearched ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("warranty:admin.warrantyDetail.searchDialog.noResults")}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common:buttons.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
