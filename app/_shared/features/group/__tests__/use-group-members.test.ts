import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "@/schema";
import { useGroupMembers } from "../use-group-members";

// Convexのモック
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

const { useQuery } = await import("convex/react");

describe("useGroupMembers", () => {
  const mockGroupId = "test-group-id" as Id<"groups">;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("初期状態ではローディング中を返す", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => useGroupMembers(mockGroupId));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.members).toEqual([]);
  });

  it("メンバーが取得できた場合、バックエンドから受け取ったメンバーをそのまま返す", () => {
    // バックエンドでソート済みのデータを想定
    // ソート順のテストはバックエンドのテスト（convex/groups/tests/）で実施
    const mockMembers = [
      {
        userId: "user-1" as Id<"users">,
        role: "patient" as const,
        joinedAt: 100,
        name: "患者1",
      },
      {
        userId: "user-2" as Id<"users">,
        role: "supporter" as const,
        joinedAt: 150,
        name: "サポーター2",
      },
      {
        userId: "user-3" as Id<"users">,
        role: "supporter" as const,
        joinedAt: 200,
        name: "サポーター1",
      },
    ];

    vi.mocked(useQuery).mockReturnValue(mockMembers);

    const { result } = renderHook(() => useGroupMembers(mockGroupId));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.members).toHaveLength(3);

    // バックエンドから受け取った順序がそのまま維持される
    expect(result.current.members[0]?.name).toBe("患者1");
    expect(result.current.members[1]?.name).toBe("サポーター2");
    expect(result.current.members[2]?.name).toBe("サポーター1");
  });

  it("メンバーが空配列の場合、空配列を返す", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    const { result } = renderHook(() => useGroupMembers(mockGroupId));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.members).toEqual([]);
  });

  it("バックエンドから受け取った順序を維持する（ソートはバックエンドで実施）", () => {
    // バックエンドでソート済みのデータを想定
    // フロントエンドは順序を変更しない
    const mockMembers = [
      {
        userId: "user-1" as Id<"users">,
        role: "patient" as const,
        joinedAt: 100,
        name: "患者1",
      },
      {
        userId: "user-2" as Id<"users">,
        role: "patient" as const,
        joinedAt: 200,
        name: "患者2",
      },
      {
        userId: "user-3" as Id<"users">,
        role: "patient" as const,
        joinedAt: 300,
        name: "患者3",
      },
    ];

    vi.mocked(useQuery).mockReturnValue(mockMembers);

    const { result } = renderHook(() => useGroupMembers(mockGroupId));

    // バックエンドから受け取った順序がそのまま維持される
    expect(result.current.members[0]?.name).toBe("患者1");
    expect(result.current.members[1]?.name).toBe("患者2");
    expect(result.current.members[2]?.name).toBe("患者3");
  });
});
