import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { GroupMembersList } from "../group-members-list";

describe("GroupMembersList", () => {
  const mockMembers = [
    {
      userId: "user-1" as Id<"users">,
      role: "patient" as const,
      joinedAt: 100,
      name: "患者1",
      displayName: "患者1",
      email: "patient1@example.com",
      image: undefined,
    },
    {
      userId: "user-2" as Id<"users">,
      role: "supporter" as const,
      joinedAt: 200,
      name: "サポーター1",
      displayName: "サポーター1",
      email: "supporter1@example.com",
      image: undefined,
    },
  ];

  it("メンバーリストが正しく表示される", () => {
    render(<GroupMembersList members={mockMembers} />);

    expect(screen.getByText("グループメンバー")).toBeInTheDocument();
    expect(screen.getByText("2人")).toBeInTheDocument();
    expect(screen.getByText("患者1")).toBeInTheDocument();
    expect(screen.getByText("サポーター1")).toBeInTheDocument();
  });

  it("メンバーがnullの場合、エラーメッセージを表示", () => {
    render(<GroupMembersList members={null} />);

    expect(screen.getByText("グループメンバー")).toBeInTheDocument();
    expect(
      screen.getByText("メンバー情報を読み込めませんでした"),
    ).toBeInTheDocument();
  });

  it("メンバーが空配列の場合、0人と表示", () => {
    render(<GroupMembersList members={[]} />);

    expect(screen.getByText("グループメンバー")).toBeInTheDocument();
    expect(screen.getByText("0人")).toBeInTheDocument();
  });

  it("メンバーが患者→サポーター順にソートされる", () => {
    const unsortedMembers = [
      {
        userId: "user-1" as Id<"users">,
        role: "supporter" as const,
        joinedAt: 100,
        name: "サポーター1",
        displayName: "サポーター1",
        email: "supporter1@example.com",
        image: undefined,
      },
      {
        userId: "user-2" as Id<"users">,
        role: "patient" as const,
        joinedAt: 200,
        name: "患者1",
        displayName: "患者1",
        email: "patient1@example.com",
        image: undefined,
      },
    ];

    render(<GroupMembersList members={unsortedMembers} />);

    // DOMの順序を確認
    const memberCards = screen.getAllByText(/患者1|サポーター1/);
    expect(memberCards[0]).toHaveTextContent("患者1");
    expect(memberCards[1]).toHaveTextContent("サポーター1");
  });

  it("同じロールのメンバーはjoinedAt順にソートされる", () => {
    const membersWithSameRole = [
      {
        userId: "user-1" as Id<"users">,
        role: "supporter" as const,
        joinedAt: 300,
        name: "サポーター3",
        displayName: "サポーター3",
        email: "supporter3@example.com",
        image: undefined,
      },
      {
        userId: "user-2" as Id<"users">,
        role: "supporter" as const,
        joinedAt: 100,
        name: "サポーター1",
        displayName: "サポーター1",
        email: "supporter1@example.com",
        image: undefined,
      },
      {
        userId: "user-3" as Id<"users">,
        role: "supporter" as const,
        joinedAt: 200,
        name: "サポーター2",
        displayName: "サポーター2",
        email: "supporter2@example.com",
        image: undefined,
      },
    ];

    render(<GroupMembersList members={membersWithSameRole} />);

    const memberCards = screen.getAllByText(/サポーター[123]/);
    expect(memberCards[0]).toHaveTextContent("サポーター1");
    expect(memberCards[1]).toHaveTextContent("サポーター2");
    expect(memberCards[2]).toHaveTextContent("サポーター3");
  });
});
