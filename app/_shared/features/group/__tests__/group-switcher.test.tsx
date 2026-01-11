import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "@/schema";
import { GroupSwitcher } from "../GroupSwitcher";

// next/navigation のモック
const mockPush = vi.fn();
const mockPathname = "/dashboard";
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

// convex/react のモック
const mockSetActiveGroup = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockSetActiveGroup,
}));

// sonner のモック
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// CreateGroupDialog のモック
vi.mock("./create-group-dialog", () => ({
  CreateGroupDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="create-group-dialog">
        <button type="button" onClick={() => onOpenChange(false)}>
          閉じる
        </button>
      </div>
    ) : null,
}));

describe("GroupSwitcher", () => {
  const mockGroups = [
    {
      groupId: "group-1" as Id<"groups">,
      groupName: "グループ1",
      role: "patient" as const,
      joinedAt: Date.now(),
    },
    {
      groupId: "group-2" as Id<"groups">,
      groupName: "グループ2",
      role: "supporter" as const,
      joinedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("セレクトボックスがレンダリングされる", () => {
    render(
      <GroupSwitcher
        groups={mockGroups}
        activeGroupId={mockGroups[0]?.groupId}
      />,
    );

    const selectTrigger = screen.getByRole("combobox");
    expect(selectTrigger).toBeInTheDocument();
  });

  it("現在のグループ名が表示される", () => {
    render(
      <GroupSwitcher
        groups={mockGroups}
        activeGroupId={mockGroups[0]?.groupId}
      />,
    );

    expect(screen.getByText("グループ1")).toBeInTheDocument();
  });

  it("「+」ボタンでCreateGroupDialogが開く", async () => {
    const user = userEvent.setup();
    render(
      <GroupSwitcher
        groups={mockGroups}
        activeGroupId={mockGroups[0]?.groupId}
      />,
    );

    const addButton = screen.getByTitle("新しいグループを作成");
    await user.click(addButton);

    expect(screen.getByTestId("create-group-dialog")).toBeInTheDocument();
  });

  it("CreateGroupDialogを閉じることができる", async () => {
    const user = userEvent.setup();
    render(
      <GroupSwitcher
        groups={mockGroups}
        activeGroupId={mockGroups[0]?.groupId}
      />,
    );

    const addButton = screen.getByTitle("新しいグループを作成");
    await user.click(addButton);

    expect(screen.getByTestId("create-group-dialog")).toBeInTheDocument();

    const cancelButton = screen.getByText("キャンセル");
    await user.click(cancelButton);

    expect(screen.queryByTestId("create-group-dialog")).not.toBeInTheDocument();
  });

  it("グループ名がない場合、「未設定」がテキストとして使われる", () => {
    const groupsWithNoName = [
      {
        groupId: "group-1" as Id<"groups">,
        groupName: undefined,
        role: "patient" as const,
        joinedAt: Date.now(),
      },
    ];

    render(
      <GroupSwitcher
        groups={groupsWithNoName}
        activeGroupId={groupsWithNoName[0]?.groupId}
      />,
    );

    // 「未設定」のテキストがSelectValueに表示される
    expect(screen.getByText("未設定")).toBeInTheDocument();
  });
});
