import { AuthPageLayout } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";

interface ModeSelectionProps {
  onSelectCreate: () => void;
  onSelectJoin: () => void;
}

export function ModeSelection({
  onSelectCreate,
  onSelectJoin,
}: ModeSelectionProps) {
  return (
    <AuthPageLayout title="初期設定" description="お薬サポートを始めましょう">
      <div className="space-y-4">
        <Button
          onClick={onSelectCreate}
          className="w-full h-auto py-6 flex flex-col items-center gap-2"
          variant="default"
        >
          <span className="text-lg font-semibold">新しいグループを作成</span>
          <span className="text-sm font-normal opacity-90">
            家族やケアチームのグループを作ります
          </span>
        </Button>

        <Button
          onClick={onSelectJoin}
          className="w-full h-auto py-6 flex flex-col items-center gap-2"
          variant="outline"
        >
          <span className="text-lg font-semibold">招待コードで参加</span>
          <span className="text-sm font-normal">
            既存のグループに参加します
          </span>
        </Button>
      </div>
    </AuthPageLayout>
  );
}
