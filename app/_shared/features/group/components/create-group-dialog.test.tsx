import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateGroupDialog } from "./CreateGroupDialog";

// convex/react のモック
const mockCreateGroup = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockCreateGroup,
}));

// sonner のモック
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const { toast } = await import("sonner");

// window.location.reload のモック
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: { reload: mockReload },
  writable: true,
});

describe("CreateGroupDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("open=falseでダイアログが表示されない", () => {
    render(<CreateGroupDialog open={false} onOpenChange={mockOnOpenChange} />);

    expect(screen.queryByText("新しいグループを作成")).not.toBeInTheDocument();
  });

  it("open=trueでダイアログが表示される", () => {
    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText("新しいグループを作成")).toBeInTheDocument();
    expect(
      screen.getByText("新しいグループを作成して、服薬管理を始めましょう。"),
    ).toBeInTheDocument();
  });

  it("フォームフィールドが全て表示される", () => {
    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText(/グループ名/)).toBeInTheDocument();
    expect(screen.getByText(/説明/)).toBeInTheDocument();
    expect(
      screen.getByText(/このグループでのあなたの役割/),
    ).toBeInTheDocument();
  });

  it("役割選択のラジオボタンが表示される", () => {
    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText("服薬者（患者）")).toBeInTheDocument();
    expect(screen.getByText("サポーター")).toBeInTheDocument();
  });

  it("キャンセルボタンでonOpenChange(false)が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("グループ名が空の場合バリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("グループ名を入力してください"),
      ).toBeInTheDocument();
    });
  });

  it("グループ名が50文字を超える場合バリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    const groupNameInput = screen.getByPlaceholderText("例: 家族の服薬管理");
    await user.type(groupNameInput, "あ".repeat(51));

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("グループ名は50文字以内で入力してください"),
      ).toBeInTheDocument();
    });
  });

  it("有効なデータで送信→成功トースト、onSuccessコールバック", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockResolvedValue({ isSuccess: true });

    render(
      <CreateGroupDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />,
    );

    const groupNameInput = screen.getByPlaceholderText("例: 家族の服薬管理");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith({
        name: "テストグループ",
        description: undefined,
        creatorRole: "supporter",
      });
      expect(toast.success).toHaveBeenCalledWith("グループを作成しました！");
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("onSuccessがない場合はページリロード", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockResolvedValue({ isSuccess: true });

    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    const groupNameInput = screen.getByPlaceholderText("例: 家族の服薬管理");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it("API失敗（Result型でisSuccess: false）→エラートースト", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockResolvedValue({
      isSuccess: false,
      errorMessage: "作成に失敗しました",
    });

    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    const groupNameInput = screen.getByPlaceholderText("例: 家族の服薬管理");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("作成に失敗しました");
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  it("API例外→エラートースト", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockRejectedValue(new Error("ネットワークエラー"));

    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    const groupNameInput = screen.getByPlaceholderText("例: 家族の服薬管理");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("ネットワークエラー");
    });
  });

  it("送信中は「作成中...」が表示される", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ isSuccess: true }), 100),
        ),
    );

    render(<CreateGroupDialog open={true} onOpenChange={mockOnOpenChange} />);

    const groupNameInput = screen.getByPlaceholderText("例: 家族の服薬管理");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    expect(screen.getByText("作成中...")).toBeInTheDocument();
  });
});
