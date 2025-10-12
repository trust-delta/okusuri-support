import { cn } from "@/lib/utils";

interface DividerProps {
  text?: string;
  className?: string;
}

/**
 * 区切り線コンポーネント
 *
 * @example
 * ```tsx
 * <Divider text="または" />
 * ```
 */
export function Divider({ text = "または", className }: DividerProps) {
  return (
    <div className={cn("relative my-6", className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300 dark:border-gray-600" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          {text}
        </span>
      </div>
    </div>
  );
}
