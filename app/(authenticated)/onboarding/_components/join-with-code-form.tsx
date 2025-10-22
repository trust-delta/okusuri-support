"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthPageLayout } from "@/features/auth";

interface JoinWithCodeFormProps {
  onBack: () => void;
}

export function JoinWithCodeForm({ onBack }: JoinWithCodeFormProps) {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState("");

  const handleSubmit = () => {
    if (invitationCode.length === 8) {
      router.push(`/invite/${invitationCode}`);
    } else {
      toast.error("招待コードは8文字です");
    }
  };

  return (
    <AuthPageLayout
      title="招待コードで参加"
      description="グループ管理者から受け取った招待コードを入力してください"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="invitationCode"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            招待コード
          </label>
          <Input
            id="invitationCode"
            name="invitationCode"
            type="text"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            maxLength={8}
            className="text-center text-lg font-mono tracking-wider"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            8文字の英数字コード
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={onBack} variant="outline" className="flex-1">
            戻る
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={invitationCode.length !== 8}
            className="flex-1"
          >
            次へ
          </Button>
        </div>
      </div>
    </AuthPageLayout>
  );
}
