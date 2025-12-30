/**
 * Sundayhug 내부 관리 시스템 - 네비게이션 바
 * 
 * 내부 활용 버전:
 * - Blog, Contact, Payments 제거
 * - Sign up 제거
 * - 한국어 UI
 */
import { HomeIcon, LogOutIcon, MenuIcon } from "lucide-react";
import { Link } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import {
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from "./ui/sheet";

/**
 * 사용자 메뉴 컴포넌트
 */
function UserMenu({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email?: string;
  avatarUrl?: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 cursor-pointer rounded-lg">
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-xs">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <SheetClose asChild>
            <Link to="/dashboard" viewTransition>
              <HomeIcon className="size-4" />
              대시보드
            </Link>
          </SheetClose>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <SheetClose asChild>
            <Link to="/logout" viewTransition>
              <LogOutIcon className="size-4" />
              로그아웃
            </Link>
          </SheetClose>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 로그인 버튼 (회원가입 제거)
 */
function AuthButtons() {
  return (
    <Button variant="default" asChild>
      <SheetClose asChild>
        <Link to="/login" viewTransition>
          로그인
        </Link>
      </SheetClose>
    </Button>
  );
}

/**
 * 액션 버튼들 (대시보드는 다크모드 없음)
 */
function Actions() {
  return null; // 테마 전환 버튼 제거
}

/**
 * 네비게이션 바 메인 컴포넌트
 */
export function NavigationBar({
  name,
  email,
  avatarUrl,
  loading,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  loading: boolean;
}) {
  return (
    <nav
      className={
        "mx-auto flex h-16 w-full items-center justify-between border-b px-5 shadow-xs backdrop-blur-lg transition-opacity md:px-10"
      }
    >
      <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between py-3">
        {/* 로고/타이틀 */}
        <Link to="/">
          <h1 className="text-lg font-extrabold">Sundayhug Admin</h1>
        </Link>
        
        {/* 데스크톱 메뉴 */}
        <div className="hidden h-full items-center gap-5 md:flex">
          <Actions />
          
          <Separator orientation="vertical" />
          
          {loading ? (
            <div className="flex items-center">
              <div className="bg-muted-foreground/20 size-8 animate-pulse rounded-lg" />
            </div>
          ) : (
            <>
              {name ? (
                <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
              ) : (
                <AuthButtons />
              )}
            </>
          )}
        </div>
        
        {/* 모바일 메뉴 */}
        <SheetTrigger className="size-6 md:hidden">
          <MenuIcon />
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <span className="text-lg font-bold">Sundayhug Admin</span>
          </SheetHeader>
          {loading ? (
            <div className="flex items-center">
              <div className="bg-muted-foreground h-4 w-24 animate-pulse rounded-full" />
            </div>
          ) : (
            <SheetFooter>
              {name ? (
                <div className="grid grid-cols-3">
                  <div className="col-span-2 flex w-full justify-between">
                    <Actions />
                  </div>
                  <div className="flex justify-end">
                    <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between">
                    <Actions />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <AuthButtons />
                  </div>
                </div>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </div>
    </nav>
  );
}
