"use client";

import {
  GroupCreationForm,
  JoinWithCodeForm,
  ModeSelection,
} from "./_components";
import { useOnboardingFlow } from "./_hooks";

export default function OnboardingPage() {
  const { mode, selectCreateMode, selectJoinMode, backToSelect } =
    useOnboardingFlow();

  if (mode === "select") {
    return (
      <ModeSelection
        onSelectCreate={selectCreateMode}
        onSelectJoin={selectJoinMode}
      />
    );
  }

  if (mode === "join") {
    return <JoinWithCodeForm onBack={backToSelect} />;
  }

  return <GroupCreationForm onBack={backToSelect} />;
}
