import { useState } from "react";

type OnboardingMode = "select" | "create" | "join";

export function useOnboardingFlow() {
  const [mode, setMode] = useState<OnboardingMode>("select");

  const selectCreateMode = () => setMode("create");
  const selectJoinMode = () => setMode("join");
  const backToSelect = () => setMode("select");

  return {
    mode,
    selectCreateMode,
    selectJoinMode,
    backToSelect,
  };
}
