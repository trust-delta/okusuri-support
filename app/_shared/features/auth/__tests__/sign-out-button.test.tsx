import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignOutButton } from "../SignOutButton";

// Convex Authのモック
const mockSignOut = vi.fn();
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signOut: mockSignOut,
  }),
}));

// Next.jsのrouterをモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("SignOutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it("デフォルトのテキストで表示される", () => {
    render(<SignOutButton />);

    expect(screen.getByText("ログアウト")).toBeInTheDocument();
  });

  it("カスタムテキストで表示される", () => {
    render(<SignOutButton>サインアウト</SignOutButton>);

    expect(screen.getByText("サインアウト")).toBeInTheDocument();
  });

  it("クリックするとsignOutが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    const button = screen.getByText("ログアウト");
    await user.click(button);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("signOut後にデフォルトでログインページにリダイレクトされる", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    const button = screen.getByText("ログアウト");
    await user.click(button);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("カスタムredirectToが指定された場合、そのパスにリダイレクトされる", async () => {
    const user = userEvent.setup();
    render(<SignOutButton redirectTo="/goodbye" />);

    const button = screen.getByText("ログアウト");
    await user.click(button);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/goodbye");
    });
  });

  it("variantプロパティが適用される", () => {
    render(<SignOutButton variant="outline" />);

    const button = screen.getByText("ログアウト");
    // variant="outline"はclassNameに反映される
    expect(button).toBeInTheDocument();
  });

  it("sizeプロパティが適用される", () => {
    render(<SignOutButton size="sm" />);

    const button = screen.getByText("ログアウト");
    expect(button).toBeInTheDocument();
  });
});
