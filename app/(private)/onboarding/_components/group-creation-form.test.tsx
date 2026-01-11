import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GroupCreationForm } from "./GroupCreationForm";

// next/navigation のモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// convex/react のモック
const mockCompleteOnboarding = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockCompleteOnboarding,
}));

// sonner のモック
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// AuthPageLayout のモック
vi.mock("@/features/auth", () => ({
  AuthPageLayout: ({
    children,
    title,
    description,
  }: {
    children: React.ReactNode;
    title: string;
    description: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

const { toast } = await import("sonner");

describe("GroupCreationForm", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タイトルと説明が正しく表示される", () => {
    render(<GroupCreationForm onBack={mockOnBack} />);

    expect(screen.getByText("新しいグループを作成")).toBeInTheDocument();
    expect(
      screen.getByText("グループ情報を入力してください"),
    ).toBeInTheDocument();
  });

  it("フォームフィールドが全て表示される", () => {
    render(<GroupCreationForm onBack={mockOnBack} />);

    expect(screen.getByLabelText("お名前")).toBeInTheDocument();
    expect(screen.getByLabelText("グループ名")).toBeInTheDocument();
    expect(screen.getByLabelText("グループの説明（任意）")).toBeInTheDocument();
    expect(screen.getByText("あなたの役割")).toBeInTheDocument();
  });

  it("役割選択のラジオボタンが表示される", () => {
    render(<GroupCreationForm onBack={mockOnBack} />);

    expect(screen.getByLabelText("服薬する人")).toBeInTheDocument();
    expect(
      screen.getByLabelText("サポーター（介護者・家族）"),
    ).toBeInTheDocument();
  });

  it("「戻る」ボタンでonBackが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<GroupCreationForm onBack={mockOnBack} />);

    const backButton = screen.getByRole("button", { name: "戻る" });
    await user.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("お名前が空の場合バリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<GroupCreationForm onBack={mockOnBack} />);

    const groupNameInput = screen.getByLabelText("グループ名");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("お名前を入力してください")).toBeInTheDocument();
    });
  });

  it("グループ名が空の場合バリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<GroupCreationForm onBack={mockOnBack} />);

    const nameInput = screen.getByLabelText("お名前");
    await user.type(nameInput, "テストユーザー");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("グループ名を入力してください"),
      ).toBeInTheDocument();
    });
  });

  it("お名前が50文字を超える場合バリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<GroupCreationForm onBack={mockOnBack} />);

    const nameInput = screen.getByLabelText("お名前");
    await user.type(nameInput, "あ".repeat(51));

    const groupNameInput = screen.getByLabelText("グループ名");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("お名前は50文字以内で入力してください"),
      ).toBeInTheDocument();
    });
  });

  it("有効なデータで送信→成功トーストとルーター遷移", async () => {
    const user = userEvent.setup();
    mockCompleteOnboarding.mockResolvedValue({ isSuccess: true });

    render(<GroupCreationForm onBack={mockOnBack} />);

    const nameInput = screen.getByLabelText("お名前");
    const groupNameInput = screen.getByLabelText("グループ名");

    await user.type(nameInput, "テストユーザー");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledWith({
        userName: "テストユーザー",
        groupName: "テストグループ",
        groupDescription: "",
        role: "patient",
      });
      expect(toast.success).toHaveBeenCalledWith("グループを作成しました");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("API失敗→エラートースト", async () => {
    const user = userEvent.setup();
    mockCompleteOnboarding.mockResolvedValue({
      isSuccess: false,
      errorMessage: "作成に失敗しました",
    });

    render(<GroupCreationForm onBack={mockOnBack} />);

    const nameInput = screen.getByLabelText("お名前");
    const groupNameInput = screen.getByLabelText("グループ名");

    await user.type(nameInput, "テストユーザー");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("作成に失敗しました");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("役割を変更できる", async () => {
    const user = userEvent.setup();
    mockCompleteOnboarding.mockResolvedValue({ isSuccess: true });

    render(<GroupCreationForm onBack={mockOnBack} />);

    const nameInput = screen.getByLabelText("お名前");
    const groupNameInput = screen.getByLabelText("グループ名");
    const supporterRadio = screen.getByLabelText("サポーター（介護者・家族）");

    await user.type(nameInput, "テストユーザー");
    await user.type(groupNameInput, "テストグループ");
    await user.click(supporterRadio);

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "supporter",
        }),
      );
    });
  });

  it("送信中は「作成中...」が表示される", async () => {
    const user = userEvent.setup();
    // 遅延を持つPromiseを返す
    mockCompleteOnboarding.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ isSuccess: true }), 100),
        ),
    );

    render(<GroupCreationForm onBack={mockOnBack} />);

    const nameInput = screen.getByLabelText("お名前");
    const groupNameInput = screen.getByLabelText("グループ名");

    await user.type(nameInput, "テストユーザー");
    await user.type(groupNameInput, "テストグループ");

    const submitButton = screen.getByRole("button", { name: "グループを作成" });
    await user.click(submitButton);

    expect(screen.getByText("作成中...")).toBeInTheDocument();
  });
});
