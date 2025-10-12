import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

/**
 * ローディング表示コンポーネント
 *
 * @example
 * ```tsx
 * <LoadingSpinner message="読み込み中..." />
 * ```
 */
export function LoadingSpinner({
  message = "読み込み中...",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <Spinner className="size-8" />
      <div className="text-lg text-gray-600 dark:text-gray-400">{message}</div>
    </div>
  );
}
