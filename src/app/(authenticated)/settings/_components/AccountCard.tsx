"use client";

import { SignOutButton } from "@/features/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export function AccountCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>アカウント</CardTitle>
      </CardHeader>
      <CardContent>
        <SignOutButton />
      </CardContent>
    </Card>
  );
}
