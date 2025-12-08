/**
 * Sundayhug 내부 관리 시스템 - Footer
 * 
 * 내부 활용 버전 - 간소화
 */

/**
 * Footer 컴포넌트
 */
export default function Footer() {
  return (
    <footer className="text-muted-foreground mt-auto flex items-center justify-center border-t py-3 text-sm md:py-5">
      <div className="mx-auto flex h-full w-full max-w-screen-2xl flex-col items-center justify-center gap-2.5 md:flex-row md:gap-0">
        <p>
          &copy; {new Date().getFullYear()} Sundayhug. 내부 관리 시스템
        </p>
      </div>
    </footer>
  );
}
