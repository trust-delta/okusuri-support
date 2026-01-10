import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "@/schema";
import { MemoEditDialog } from "../MemoEditDialog";

// Convex のモック
const mockUpdateMutation = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateMutation,
}));

// sonner のモック
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("sonner");

describe("MemoEditDialog", () => {
  const mockRecordId = "test-record-id" as Id<"medicationRecords">;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMutation.mockResolvedValue({ isSuccess: true });
  });

  it("トリガーボタンが表示される", () => {
    render(<MemoEditDialog recordId={mockRecordId} />);

    // メモアイコンボタンが存在する
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("メモがない場合、トリガーボタンのタイトルは「メモを追加」", () => {
    render(<MemoEditDialog recordId={mockRecordId} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title", "メモを追加");
  });

  it("メモがある場合、トリガーボタンのタイトルは「メモを編集」", () => {
    render(<MemoEditDialog recordId={mockRecordId} currentMemo="テストメモ" />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title", "メモを編集");
  });

  it("クリックするとダイアログが開く", async () => {
    const user = userEvent.setup();
    render(<MemoEditDialog recordId={mockRecordId} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(screen.getByText("メモを追加")).toBeInTheDocument();
  });

  it("ダイアログに薬名が表示される", async () => {
    const user = userEvent.setup();
    render(
      <MemoEditDialog recordId={mockRecordId} medicineName="ロキソニン" />,
    );

    const button = screen.getByRole("button");
    await user.click(button);

    expect(screen.getByText("ロキソニン の服薬記録")).toBeInTheDocument();
  });

  it("メモを入力して保存できる", async () => {
    const user = userEvent.setup();
    render(<MemoEditDialog recordId={mockRecordId} />);

    // ダイアログを開く
    const button = screen.getByRole("button");
    await user.click(button);

    // メモを入力
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "新しいメモ");

    // 保存ボタンをクリック
    const saveButton = screen.getByRole("button", { name: "保存" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMutation).toHaveBeenCalledWith({
        recordId: mockRecordId,
        notes: "新しいメモ",
      });
    });

    expect(toast.success).toHaveBeenCalledWith("メモを保存しました");
  });

  it("残り文字数が表示される", async () => {
    const user = userEvent.setup();
    render(<MemoEditDialog recordId={mockRecordId} />);

    const button = screen.getByRole("button");
    await user.click(button);

    // 初期状態で500文字
    expect(screen.getByText("残り 500 文字")).toBeInTheDocument();
  });

  it("文字数制限を超えると警告色になる", async () => {
    const user = userEvent.setup();
    // 499文字のメモ
    const longMemo = "あ".repeat(499);
    render(<MemoEditDialog recordId={mockRecordId} currentMemo={longMemo} />);

    const button = screen.getByRole("button");
    await user.click(button);

    // 残り1文字
    expect(screen.getByText("残り 1 文字")).toBeInTheDocument();
  });

  it("キャンセルボタンでダイアログが閉じる", async () => {
    const user = userEvent.setup();
    render(<MemoEditDialog recordId={mockRecordId} />);

    // ダイアログを開く
    const openButton = screen.getByRole("button");
    await user.click(openButton);

    expect(screen.getByText("メモを追加")).toBeInTheDocument();

    // キャンセルボタンをクリック
    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("メモを追加")).not.toBeInTheDocument();
    });
  });

  it("メモがある場合、削除ボタンが表示される", async () => {
    const user = userEvent.setup();
    render(<MemoEditDialog recordId={mockRecordId} currentMemo="既存のメモ" />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
  });

  it("メモがない場合、削除ボタンは表示されない", async () => {
    const user = userEvent.setup();
    render(<MemoEditDialog recordId={mockRecordId} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(
      screen.queryByRole("button", { name: "削除" }),
    ).not.toBeInTheDocument();
  });

  it("削除ボタンをクリックするとメモが削除される", async () => {
    const user = userEvent.setup();
    render(
      <MemoEditDialog recordId={mockRecordId} currentMemo="削除するメモ" />,
    );

    // ダイアログを開く
    const openButton = screen.getByRole("button");
    await user.click(openButton);

    // 削除ボタンをクリック
    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockUpdateMutation).toHaveBeenCalledWith({
        recordId: mockRecordId,
        notes: undefined,
      });
    });

    expect(toast.success).toHaveBeenCalledWith("メモを削除しました");
  });

  it("APIエラー時にエラーメッセージが表示される", async () => {
    mockUpdateMutation.mockResolvedValue({
      isSuccess: false,
      errorMessage: "保存に失敗しました",
    });

    const user = userEvent.setup();
    render(<MemoEditDialog recordId={mockRecordId} />);

    // ダイアログを開く
    const button = screen.getByRole("button");
    await user.click(button);

    // メモを入力して保存
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "テストメモ");

    const saveButton = screen.getByRole("button", { name: "保存" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("保存に失敗しました");
    });
  });

  it("triggerVariant='button'でボタン形式のトリガーが表示される", () => {
    render(<MemoEditDialog recordId={mockRecordId} triggerVariant="button" />);

    expect(screen.getByText("メモを追加")).toBeInTheDocument();
  });

  it("triggerVariant='button'でメモがある場合、「メモを編集」と表示される", () => {
    render(
      <MemoEditDialog
        recordId={mockRecordId}
        currentMemo="テスト"
        triggerVariant="button"
      />,
    );

    expect(screen.getByText("メモを編集")).toBeInTheDocument();
  });
});
