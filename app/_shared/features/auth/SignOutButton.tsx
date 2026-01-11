"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  redirectTo?: string;
  children?: React.ReactNode;
}

export function SignOutButton({
  variant = "destructive",
  size = "default",
  redirectTo = "/login",
  children = "ログアウト",
}: SignOutButtonProps) {
  const router = useRouter();
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
    router.push(redirectTo);
  };

  return (
    <Button type="button" variant={variant} size={size} onClick={handleSignOut}>
      {children}
    </Button>
  );
}
