import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModeSelection } from "../mode-selection";

describe("ModeSelection", () => {
  it("タイトルと説明が表示される", () => {
    const mockOnSelectCreate = vi.fn();
    const mockOnSelectJoin = vi.fn();

    render(
      <ModeSelection
        onSelectCreate={mockOnSelectCreate}
        onSelectJoin={mockOnSelectJoin}
      />
    );

    expect(screen.getByText("初期設定")).toBeInTheDocument();
    expect(
      screen.getByText("お薬サポートを始めましょう")
    ).toBeInTheDocument();
  });

  it("グループ作成ボタンが表示される", () => {
    const mockOnSelectCreate = vi.fn();
    const mockOnSelectJoin = vi.fn();

    render(
      <ModeSelection
        onSelectCreate={mockOnSelectCreate}
        onSelectJoin={mockOnSelectJoin}
      />
    );

    expect(screen.getByText("新しいグループを作成")).toBeInTheDocument();
    expect(
      screen.getByText("家族やケアチームのグループを作ります")
    ).toBeInTheDocument();
  });

  it("招待コード参加ボタンが表示される", () => {
    const mockOnSelectCreate = vi.fn();
    const mockOnSelectJoin = vi.fn();

    render(
      <ModeSelection
        onSelectCreate={mockOnSelectCreate}
        onSelectJoin={mockOnSelectJoin}
      />
    );

    expect(screen.getByText("招待コードで参加")).toBeInTheDocument();
    expect(screen.getByText("既存のグループに参加します")).toBeInTheDocument();
  });

  it("グループ作成ボタンをクリックするとonSelectCreateが呼ばれる", async () => {
    const user = userEvent.setup();
    const mockOnSelectCreate = vi.fn();
    const mockOnSelectJoin = vi.fn();

    render(
      <ModeSelection
        onSelectCreate={mockOnSelectCreate}
        onSelectJoin={mockOnSelectJoin}
      />
    );

    const createButton = screen.getByText("新しいグループを作成");
    await user.click(createButton);

    expect(mockOnSelectCreate).toHaveBeenCalledTimes(1);
    expect(mockOnSelectJoin).not.toHaveBeenCalled();
  });

  it("招待コード参加ボタンをクリックするとonSelectJoinが呼ばれる", async () => {
    const user = userEvent.setup();
    const mockOnSelectCreate = vi.fn();
    const mockOnSelectJoin = vi.fn();

    render(
      <ModeSelection
        onSelectCreate={mockOnSelectCreate}
        onSelectJoin={mockOnSelectJoin}
      />
    );

    const joinButton = screen.getByText("招待コードで参加");
    await user.click(joinButton);

    expect(mockOnSelectJoin).toHaveBeenCalledTimes(1);
    expect(mockOnSelectCreate).not.toHaveBeenCalled();
  });
});
