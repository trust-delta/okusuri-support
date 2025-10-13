import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useGroupMembers } from "../use-group-members";
import type { Id } from "../../../../../convex/_generated/dataModel";

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

  it("メンバーが取得できた場合、ソートされたメンバーを返す", () => {
    const mockMembers = [
      {
        userId: "user-1" as Id<"users">,
        role: "supporter" as const,
        joinedAt: 200,
        name: "サポーター1",
      },
      {
        userId: "user-2" as Id<"users">,
        role: "patient" as const,
        joinedAt: 100,
        name: "患者1",
      },
      {
        userId: "user-3" as Id<"users">,
        role: "supporter" as const,
        joinedAt: 150,
        name: "サポーター2",
      },
    ];

    vi.mocked(useQuery).mockReturnValue(mockMembers);

    const { result } = renderHook(() => useGroupMembers(mockGroupId));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.members).toHaveLength(3);

    // 患者が最初に来る
    expect(result.current.members[0].role).toBe("patient");
    expect(result.current.members[0].name).toBe("患者1");

    // サポーターはjoinedAt順（150 < 200）
    expect(result.current.members[1].name).toBe("サポーター2");
    expect(result.current.members[2].name).toBe("サポーター1");
  });

  it("メンバーが空配列の場合、空配列を返す", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    const { result } = renderHook(() => useGroupMembers(mockGroupId));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.members).toEqual([]);
  });

  it("同じロールのメンバーは参加日時順にソートされる", () => {
    const mockMembers = [
      {
        userId: "user-1" as Id<"users">,
        role: "patient" as const,
        joinedAt: 300,
        name: "患者3",
      },
      {
        userId: "user-2" as Id<"users">,
        role: "patient" as const,
        joinedAt: 100,
        name: "患者1",
      },
      {
        userId: "user-3" as Id<"users">,
        role: "patient" as const,
        joinedAt: 200,
        name: "患者2",
      },
    ];

    vi.mocked(useQuery).mockReturnValue(mockMembers);

    const { result } = renderHook(() => useGroupMembers(mockGroupId));

    expect(result.current.members[0].name).toBe("患者1");
    expect(result.current.members[1].name).toBe("患者2");
    expect(result.current.members[2].name).toBe("患者3");
  });
});
