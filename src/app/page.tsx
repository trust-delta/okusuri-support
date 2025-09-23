"use client";

import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home() {
  const tasks = useQuery(api.tasks.get);
  return (
    <>
      {tasks?.map(({ _id, text }) => (
        <div key={_id}>{text}</div>
      ))}
      <Authenticated>
        認証済
        <UserButton />
        <Content />
        <SignOutButton />
      </Authenticated>
      <Unauthenticated>
        未認証
        <SignInButton />
      </Unauthenticated>
    </>
  );
}

function Content() {
  const messages = useQuery(api.messages.getForCurrentUser);
  return <div>Authenticated content: {messages?.length}</div>;
}
