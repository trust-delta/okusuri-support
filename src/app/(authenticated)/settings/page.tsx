import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/shared/lib/convex";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const token = await convexAuthNextjsToken();

  const currentUser = await preloadQuery(
    api.users.getCurrentUser,
    {},
    { token },
  );

  const groupStatus = await preloadQuery(
    api.groups.getUserGroupStatus,
    {},
    { token },
  );

  // 認証されていない場合はログインページへ
  if (currentUser === null || groupStatus === null) {
    redirect("/login");
  }

  return (
    <SettingsClient
      preloadedCurrentUser={currentUser}
      preloadedGroupStatus={groupStatus}
    />
  );
}
