import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAuthSignIn } from "../OauthSignIn";

// Convex Authのモック
const mockSignIn = vi.fn();
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signIn: mockSignIn,
  }),
}));

describe("OAuthSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GitHubボタンが正しく表示される", () => {
    render(<OAuthSignIn provider="github" />);

    expect(screen.getByText("GitHubでログイン")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "GitHub" })).toBeInTheDocument();
  });

  it("Googleボタンが正しく表示される", () => {
    render(<OAuthSignIn provider="google" />);

    expect(screen.getByText("Googleでログイン")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Google" })).toBeInTheDocument();
  });

  it("GitHubボタンをクリックするとsignInが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<OAuthSignIn provider="github" redirectTo="/custom-path" />);

    const button = screen.getByText("GitHubでログイン");
    await user.click(button);

    expect(mockSignIn).toHaveBeenCalledWith("github", {
      redirectTo: "/custom-path",
    });
  });

  it("GoogleボタンをクリックするとsignInが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<OAuthSignIn provider="google" />);

    const button = screen.getByText("Googleでログイン");
    await user.click(button);

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      redirectTo: "/dashboard",
    });
  });

  it("デフォルトのredirectToは/dashboard", async () => {
    const user = userEvent.setup();
    render(<OAuthSignIn provider="github" />);

    const button = screen.getByText("GitHubでログイン");
    await user.click(button);

    expect(mockSignIn).toHaveBeenCalledWith("github", {
      redirectTo: "/dashboard",
    });
  });

  it("カスタムclassNameが適用される", () => {
    render(<OAuthSignIn provider="github" className="custom-class" />);

    const button = screen.getByText("GitHubでログイン");
    expect(button).toHaveClass("custom-class");
  });
});
