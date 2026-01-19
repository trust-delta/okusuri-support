import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroupMembersList } from "../GroupMembersList";

describe("GroupMembersList", () => {
  const mockMembers = [
    {
      userId: "user-1",
      role: "patient" as const,
      joinedAt: 100,
      name: "患者1",
      displayName: "患者1",
      email: "patient1@example.com",
      image: undefined,
    },
    {
      userId: "user-2",
      role: "supporter" as const,
      joinedAt: 200,
      name: "サポーター1",
      displayName: "サポーター1",
      email: "supporter1@example.com",
      image: undefined,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any;

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

  // Note: ソートはバックエンド(getGroupMembers)で実行されるため、
  // フロントエンドのソートテストは不要
});
