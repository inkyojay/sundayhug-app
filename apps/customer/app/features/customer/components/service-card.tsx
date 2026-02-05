/**
 * 서비스 카드 컴포넌트
 *
 * 홈 화면의 Bento Grid 서비스 카드에 사용.
 */
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

interface ServiceCardProps {
  to: string;
  label: string;
  title: string;
  description: string;
  buttonText: string;
  icon: React.ReactNode;
  variant: "orange" | "dark" | "gradient-orange" | "gradient-emerald";
  size?: "large" | "medium";
}

const variantStyles = {
  orange: {
    bg: "bg-[#FF6B35]",
    label: "text-white/80",
    title: "text-white",
    description: "text-white/90",
    cta: "text-white/80 group-hover:text-white",
    iconBg: "bg-white/20",
  },
  dark: {
    bg: "bg-[#1A1A1A]",
    label: "text-gray-400",
    title: "text-white",
    description: "text-gray-400",
    cta: "text-gray-500 group-hover:text-white",
    iconBg: "bg-white/10",
  },
  "gradient-orange": {
    bg: "bg-gradient-to-br from-orange-500 to-orange-600",
    label: "text-orange-200",
    title: "text-white",
    description: "text-orange-100",
    cta: "text-white/80 group-hover:text-white",
    iconBg: "bg-white/20",
  },
  "gradient-emerald": {
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    label: "text-emerald-200",
    title: "text-white",
    description: "text-emerald-100",
    cta: "text-white/80 group-hover:text-white",
    iconBg: "bg-white/20",
  },
} as const;

export function ServiceCard({
  to,
  label,
  title,
  description,
  buttonText,
  icon,
  variant,
  size = "large",
}: ServiceCardProps) {
  const styles = variantStyles[variant];
  const minHeight = size === "large" ? "min-h-[280px] md:min-h-[350px]" : "min-h-[180px]";
  const titleSize = size === "large" ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl";
  const textSize = size === "large" ? "text-base md:text-lg" : "text-sm md:text-base";
  const iconSize = size === "large" ? "w-12 h-12" : "w-10 h-10";
  const padding = size === "large" ? "p-8" : "p-6";

  return (
    <Link to={to} className="group">
      <div
        className={`h-full ${minHeight} ${styles.bg} rounded-3xl ${padding} flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className={`${styles.label} text-sm font-medium tracking-wider uppercase`}>
              {label}
            </p>
            <h2 className={`${styles.title} ${titleSize} font-bold mt-2`}>
              {title}
            </h2>
          </div>
          <div className={`${iconSize} ${styles.iconBg} rounded-full flex items-center justify-center`}>
            {icon}
          </div>
        </div>

        <div>
          <p className={`${styles.description} ${textSize}`}>
            {description}
          </p>
          <div className={`${size === "large" ? "mt-4" : "mt-3"} flex items-center ${styles.cta} transition-colors`}>
            <span className="text-sm font-medium">{buttonText}</span>
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
