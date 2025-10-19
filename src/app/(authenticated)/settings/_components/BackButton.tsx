"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button variant="ghost" onClick={() => router.back()}>
      戻る
    </Button>
  );
}
