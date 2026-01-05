import { SearchIcon } from "lucide-react";
import type { ChangeEvent } from "react";
import { Input } from "~/core/components/ui/input";
import { cn } from "~/core/lib/utils";

export interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  inputClassName?: string;
}

export function SearchInput({
  placeholder = "검색...",
  value,
  onChange,
  className,
  inputClassName,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn("pl-10", inputClassName)}
      />
    </div>
  );
}
