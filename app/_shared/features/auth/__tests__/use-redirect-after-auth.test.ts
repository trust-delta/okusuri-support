import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRedirectAfterAuth } from "../use-redirect-after-auth";

// Next.jsのrouterをモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Convexのモック
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

const { useQuery } = await import("convex/react");

describe("useRedirectAfterAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中の状態を正しく返す", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => useRedirectAfterAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.groupStatus).toBeUndefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("未認証の場合、ログインページにリダイレクトする", async () => {
    vi.mocked(useQuery).mockReturnValue(null);

    renderHook(() => useRedirectAfterAuth());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("グループに所属していない場合、オンボーディングページにリダイレクトする", async () => {
    const mockGroupStatus = {
      hasGroup: false,
    };
    vi.mocked(useQuery).mockReturnValue(mockGroupStatus);

    renderHook(() => useRedirectAfterAuth());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("グループに所属している場合、リダイレクトしない", () => {
    const mockGroupStatus = {
      hasGroup: true,
      groupId: "group-123",
    };
    vi.mocked(useQuery).mockReturnValue(mockGroupStatus);

    const { result } = renderHook(() => useRedirectAfterAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.groupStatus).toEqual(mockGroupStatus);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("groupStatusが変更されたときに再評価される", async () => {
    const { rerender } = renderHook(() => useRedirectAfterAuth());

    // 最初は読み込み中
    vi.mocked(useQuery).mockReturnValue(undefined);
    rerender();
    expect(mockPush).not.toHaveBeenCalled();

    // 次にグループなし状態になる
    vi.mocked(useQuery).mockReturnValue({ hasGroup: false });
    rerender();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/onboarding");
    });
  });
});
