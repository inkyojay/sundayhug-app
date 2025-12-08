/**
 * Sleep Analysis Icons
 *
 * Custom and Lucide React icons for the sleep analysis feature.
 */
import {
  AlertTriangle,
  Baby,
  CheckCircle2,
  ChevronDown,
  Info,
  AlertCircle,
  Upload,
} from "lucide-react";

import { cn } from "~/core/lib/utils";

import type { RiskLevel } from "../schema";

// Re-export common icons from Lucide
export { Upload as UploadIcon, Baby as BabyIcon, ChevronDown as ChevronDownIcon };

// Risk level icons with appropriate styling
export function HighRiskIcon({ className }: { className?: string }) {
  return <AlertTriangle className={cn("text-red-500", className)} />;
}

export function MediumRiskIcon({ className }: { className?: string }) {
  return <AlertCircle className={cn("text-yellow-500", className)} />;
}

export function LowRiskIcon({ className }: { className?: string }) {
  return <CheckCircle2 className={cn("text-green-500", className)} />;
}

export function InfoIcon({ className }: { className?: string }) {
  return <Info className={cn("text-blue-500", className)} />;
}

/**
 * Get the appropriate icon component based on risk level
 */
export function getRiskIcon(riskLevel: RiskLevel, className?: string) {
  const iconProps = { className: cn("h-5 w-5", className) };
  
  switch (riskLevel) {
    case "High":
      return <HighRiskIcon {...iconProps} />;
    case "Medium":
      return <MediumRiskIcon {...iconProps} />;
    case "Low":
      return <LowRiskIcon {...iconProps} />;
    case "Info":
      return <InfoIcon {...iconProps} />;
    default:
      return null;
  }
}

/**
 * Get Tailwind CSS color classes based on risk level
 */
export function getRiskColorClasses(riskLevel: RiskLevel) {
  switch (riskLevel) {
    case "High":
      return {
        bg: "bg-red-100 dark:bg-red-950",
        text: "text-red-800 dark:text-red-200",
        border: "border-red-400 dark:border-red-600",
        pin: "bg-red-500",
      };
    case "Medium":
      return {
        bg: "bg-yellow-100 dark:bg-yellow-950",
        text: "text-yellow-800 dark:text-yellow-200",
        border: "border-yellow-400 dark:border-yellow-600",
        pin: "bg-yellow-500",
      };
    case "Low":
      return {
        bg: "bg-green-100 dark:bg-green-950",
        text: "text-green-800 dark:text-green-200",
        border: "border-green-400 dark:border-green-600",
        pin: "bg-green-500",
      };
    case "Info":
    default:
      return {
        bg: "bg-blue-100 dark:bg-blue-950",
        text: "text-blue-800 dark:text-blue-200",
        border: "border-blue-400 dark:border-blue-600",
        pin: "bg-blue-500",
      };
  }
}



