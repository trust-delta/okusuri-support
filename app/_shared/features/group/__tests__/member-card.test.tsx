import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemberCard } from "../MemberCard";

describe("MemberCard", () => {
  it("患者のメンバーカードが正しく表示される", () => {
    const patientMember = {
      userId: "user-1",
      displayName: "山田太郎",
      name: "山田太郎",
      email: "yamada@example.com",
      image: "https://example.com/avatar.jpg",
      role: "patient" as const,
      joinedAt: new Date("2025-01-15").getTime(),
    };

    render(<MemberCard member={patientMember} />);

    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("患者")).toBeInTheDocument();
    expect(screen.getByText(/参加日: 2025\/1\/15/)).toBeInTheDocument();
  });

  it("サポーターのメンバーカードが正しく表示される", () => {
    const supporterMember = {
      userId: "user-2",
      displayName: "佐藤花子",
      name: "佐藤花子",
      email: "sato@example.com",
      image: null,
      role: "supporter" as const,
      joinedAt: new Date("2025-02-20").getTime(),
    };

    render(<MemberCard member={supporterMember} />);

    expect(screen.getByText("佐藤花子")).toBeInTheDocument();
    expect(screen.getByText("サポーター")).toBeInTheDocument();
    expect(screen.getByText(/参加日: 2025\/2\/20/)).toBeInTheDocument();
  });

  it("displayNameが優先的に表示される", () => {
    const member = {
      userId: "user-3",
      displayName: "表示名",
      name: "本名",
      email: "test@example.com",
      image: null,
      role: "patient" as const,
      joinedAt: Date.now(),
    };

    render(<MemberCard member={member} />);

    expect(screen.getByText("表示名")).toBeInTheDocument();
    expect(screen.queryByText("本名")).not.toBeInTheDocument();
  });

  it("画像がnullの場合、フォールバックが表示される", () => {
    const member = {
      userId: "user-4",
      displayName: "テストユーザー",
      name: "テストユーザー",
      email: "test@example.com",
      image: null,
      role: "supporter" as const,
      joinedAt: Date.now(),
    };

    render(<MemberCard member={member} />);

    // AvatarFallbackに名前の頭文字が表示される
    expect(screen.getByText("テ")).toBeInTheDocument();
  });

  it("displayNameがundefinedの場合、nameやemailから頭文字を取得", () => {
    const memberWithoutDisplayName = {
      userId: "user-5",
      displayName: undefined,
      name: "田中一郎",
      email: "tanaka@example.com",
      image: null,
      role: "patient" as const,
      joinedAt: Date.now(),
    };

    render(<MemberCard member={memberWithoutDisplayName} />);

    // nameの頭文字が表示される
    expect(screen.getByText("田")).toBeInTheDocument();
  });

  it("すべての名前情報がない場合、emailの頭文字を使用", () => {
    const memberWithOnlyEmail = {
      userId: "user-6",
      displayName: undefined,
      name: null,
      email: "example@test.com",
      image: null,
      role: "supporter" as const,
      joinedAt: Date.now(),
    };

    render(<MemberCard member={memberWithOnlyEmail} />);

    // emailの頭文字が表示される
    expect(screen.getByText("e")).toBeInTheDocument();
  });

  it("すべての情報がない場合、?が表示される", () => {
    const memberWithNoInfo = {
      userId: "user-7",
      displayName: undefined,
      name: null,
      email: null,
      image: null,
      role: "patient" as const,
      joinedAt: Date.now(),
    };

    render(<MemberCard member={memberWithNoInfo} />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
