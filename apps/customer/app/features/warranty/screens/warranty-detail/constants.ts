/**
 * Warranty Detail Constants
 */
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "lucide-react";

export const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
> = {
  pending: { label: "승인 대기", variant: "outline", icon: ClockIcon },
  approved: { label: "승인 완료", variant: "default", icon: CheckCircleIcon },
  rejected: { label: "거절", variant: "destructive", icon: XCircleIcon },
  expired: { label: "만료", variant: "secondary", icon: ClockIcon },
};
