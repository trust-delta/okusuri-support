import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteForm } from "./InviteForm";

// next/navigation のモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// convex/react のモック
const mockJoinGroup = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockJoinGroup,
}));

// sonner のモック
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const { toast } = await import("sonner");

describe("InviteForm", () => {
  const defaultProps = {
    invitationCode: "TESTCODE",
    groupName: "テストグループ",
    allowedRoles: ["patient" as const, "supporter" as const],
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7日後
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("グループ名と有効期限が表示される", () => {
    render(<InviteForm {...defaultProps} />);

    expect(screen.getByText("グループへの招待")).toBeInTheDocument();
    expect(
      screen.getByText(`「${defaultProps.groupName}」に招待されています`),
    ).toBeInTheDocument();
    expect(screen.getByText(/有効期限:/)).toBeInTheDocument();
  });

  it("表示名フィールドが表示される", () => {
    render(<InviteForm {...defaultProps} />);

    expect(screen.getByText("表示名")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("山田 太郎")).toBeInTheDocument();
  });

  it("currentUserDisplayNameがある場合、入力フィールドが無効化", () => {
    render(
      <InviteForm {...defaultProps} currentUserDisplayName="既存ユーザー" />,
    );

    const displayNameInput = screen.getByPlaceholderText("山田 太郎");
    expect(displayNameInput).toBeDisabled();
  });

  it("allowedRolesに応じてラジオボタンが表示される（両方許可）", () => {
    render(<InviteForm {...defaultProps} />);

    expect(screen.getByText("服薬する人（患者）")).toBeInTheDocument();
    expect(screen.getByText("サポートする人")).toBeInTheDocument();
  });

  it("allowedRolesがsupporterのみの場合、patientラジオが表示されない", () => {
    render(<InviteForm {...defaultProps} allowedRoles={["supporter"]} />);

    expect(screen.queryByText("服薬する人（患者）")).not.toBeInTheDocument();
    expect(screen.getByText("サポートする人")).toBeInTheDocument();
  });

  it("supporterのみの場合、注意メッセージが表示される", () => {
    render(<InviteForm {...defaultProps} allowedRoles={["supporter"]} />);

    expect(
      screen.getByText(
        "このグループには既に患者が登録されているため、サポーター役割でのみ参加できます。",
      ),
    ).toBeInTheDocument();
  });

  it("有効なデータで送信→成功トースト、ルーター遷移", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockResolvedValue({ isSuccess: true });

    render(<InviteForm {...defaultProps} />);

    const displayNameInput = screen.getByPlaceholderText("山田 太郎");
    await user.type(displayNameInput, "テストユーザー");

    const submitButton = screen.getByRole("button", {
      name: "グループに参加する",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockJoinGroup).toHaveBeenCalledWith({
        invitationCode: "TESTCODE",
        role: "supporter",
        displayName: "テストユーザー",
      });
      expect(toast.success).toHaveBeenCalledWith("グループに参加しました！");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("currentUserDisplayNameがある場合、displayNameはundefined", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockResolvedValue({ isSuccess: true });

    render(
      <InviteForm {...defaultProps} currentUserDisplayName="既存ユーザー" />,
    );

    const submitButton = screen.getByRole("button", {
      name: "グループに参加する",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockJoinGroup).toHaveBeenCalledWith({
        invitationCode: "TESTCODE",
        role: "supporter",
        displayName: undefined,
      });
    });
  });

  it("API失敗（Result型でisSuccess: false）→エラートースト", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockResolvedValue({
      isSuccess: false,
      errorMessage: "参加に失敗しました",
    });

    render(<InviteForm {...defaultProps} />);

    const displayNameInput = screen.getByPlaceholderText("山田 太郎");
    await user.type(displayNameInput, "テストユーザー");

    const submitButton = screen.getByRole("button", {
      name: "グループに参加する",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("参加に失敗しました");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("API例外→エラートースト", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockRejectedValue(new Error("ネットワークエラー"));

    render(<InviteForm {...defaultProps} />);

    const displayNameInput = screen.getByPlaceholderText("山田 太郎");
    await user.type(displayNameInput, "テストユーザー");

    const submitButton = screen.getByRole("button", {
      name: "グループに参加する",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("ネットワークエラー");
    });
  });

  it("送信中は「参加中...」が表示される", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ isSuccess: true }), 100),
        ),
    );

    render(<InviteForm {...defaultProps} />);

    const displayNameInput = screen.getByPlaceholderText("山田 太郎");
    await user.type(displayNameInput, "テストユーザー");

    const submitButton = screen.getByRole("button", {
      name: "グループに参加する",
    });
    await user.click(submitButton);

    expect(screen.getByText("参加中...")).toBeInTheDocument();
  });

  it("表示名が空の場合バリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<InviteForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "グループに参加する",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("表示名を入力してください")).toBeInTheDocument();
    });
  });

  // Note: 入力フィールドにmaxLength={50}があるため、
  // 50文字を超える入力はHTMLレベルで制限される。
  // そのため、このバリデーションはサーバーサイドで確認する。
});
