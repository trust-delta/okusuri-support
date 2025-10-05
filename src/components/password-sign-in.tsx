import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function PasswordSignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signIn" | "signUp" | { email: string }>(
    "signIn"
  );
  return step === "signIn" || step === "signUp" ? (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void signIn("password", formData).then(() =>
          setStep({ email: formData.get("email") as string })
        );
      }}
    >
      <input name="email" placeholder="Email" type="text" />
      <input name="password" placeholder="Password" type="password" />
      <input name="flow" value={step} type="hidden" />
      <button type="submit">{step === "signIn" ? "Sign in" : "Sign up"}</button>
      <button
        type="button"
        onClick={() => {
          setStep(step === "signIn" ? "signUp" : "signIn");
        }}
      >
        {step === "signIn" ? "Sign up instead" : "Sign in instead"}
      </button>
    </form>
  ) : (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void signIn("password", formData);
      }}
    >
      <input name="code" placeholder="Code" type="text" />
      <input name="flow" type="hidden" value="email-verification" />
      <input name="email" value={step.email} type="hidden" />
      <button type="submit">Continue</button>
      <button type="button" onClick={() => setStep("signIn")}>
        Cancel
      </button>
    </form>
  );
}