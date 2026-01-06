/**
 * 언어 선택 컴포넌트
 *
 * 사용자가 언어를 변경할 수 있는 드롭다운
 */
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/core/components/ui/dropdown-menu";
import { Button } from "~/core/components/ui/button";
import { cn } from "~/core/lib/utils";

// 지원 언어 목록 (번역 파일이 준비된 언어만 활성화)
const languages = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  // 아래 언어들은 번역 파일 추가 후 활성화
  // { code: "ja", name: "日本語", flag: "🇯🇵" },
  // { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  // { code: "zh-TW", name: "繁體中文", flag: "🇹🇼" },
  // { code: "zh-CN", name: "简体中文", flag: "🇨🇳" },
  // { code: "ar", name: "العربية", flag: "🇸🇦" },
] as const;

interface LanguageSelectorProps {
  className?: string;
  variant?: "default" | "minimal";
}

export function LanguageSelector({ className, variant = "default" }: LanguageSelectorProps) {
  const { i18n } = useTranslation();

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleLanguageChange = async (langCode: string) => {
    // 쿠키 설정을 위해 API 호출
    await fetch("/api/settings/locale", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ locale: langCode }),
    });

    // 페이지 새로고침으로 서버 측 번역 리소스 로드
    window.location.reload();
  };

  if (variant === "minimal") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-2", className)}
          >
            <span className="text-lg">{currentLang.flag}</span>
            <span className="text-sm">{currentLang.code.toUpperCase()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.name}</span>
              </div>
              {i18n.language === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
            className
          )}
        >
          <Globe className="h-4 w-4" />
          <span className="text-lg">{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
            {i18n.language === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSelector;
