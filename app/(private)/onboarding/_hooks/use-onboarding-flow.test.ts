import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOnboardingFlow } from "./use-onboarding-flow";

describe("useOnboardingFlow", () => {
  it("初期状態はselectモード", () => {
    const { result } = renderHook(() => useOnboardingFlow());

    expect(result.current.mode).toBe("select");
  });

  it("selectCreateModeを呼ぶとcreateモードに切り替わる", () => {
    const { result } = renderHook(() => useOnboardingFlow());

    act(() => {
      result.current.selectCreateMode();
    });

    expect(result.current.mode).toBe("create");
  });

  it("selectJoinModeを呼ぶとjoinモードに切り替わる", () => {
    const { result } = renderHook(() => useOnboardingFlow());

    act(() => {
      result.current.selectJoinMode();
    });

    expect(result.current.mode).toBe("join");
  });

  it("backToSelectを呼ぶとselectモードに戻る", () => {
    const { result } = renderHook(() => useOnboardingFlow());

    // まずcreateモードに移動
    act(() => {
      result.current.selectCreateMode();
    });
    expect(result.current.mode).toBe("create");

    // selectモードに戻る
    act(() => {
      result.current.backToSelect();
    });
    expect(result.current.mode).toBe("select");
  });

  it("モード遷移のフローが正しく動作する", () => {
    const { result } = renderHook(() => useOnboardingFlow());

    // select -> create
    act(() => {
      result.current.selectCreateMode();
    });
    expect(result.current.mode).toBe("create");

    // create -> select
    act(() => {
      result.current.backToSelect();
    });
    expect(result.current.mode).toBe("select");

    // select -> join
    act(() => {
      result.current.selectJoinMode();
    });
    expect(result.current.mode).toBe("join");

    // join -> select
    act(() => {
      result.current.backToSelect();
    });
    expect(result.current.mode).toBe("select");
  });
});
