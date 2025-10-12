import { Separator } from "@/components/ui/separator";
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
/**
 * 区切り線コンポーネント
 * テキスト付きの水平区切り線を表示します
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
        <Separator />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-background px-2 text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}
