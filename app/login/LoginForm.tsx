"use client";

import { useActionState } from "react";
import { sendLink, verifyCode, type LoginState } from "./actions";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [state, send, sending] = useActionState<LoginState, FormData>(sendLink, {
    step: "email",
    error: initialError,
  });
  const [codeState, verify, verifying] = useActionState<LoginState, FormData>(verifyCode, {
    step: "code",
  });

  if (state.step === "code") {
    return (
      <form action={verify} className="stack">
        <p className="muted">{state.message}</p>
        <input type="hidden" name="email" value={state.email} />
        <label>
          Code
          <input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required />
        </label>
        {codeState.error && <p className="error">{codeState.error}</p>}
        <button type="submit" disabled={verifying}>{verifying ? "Checking…" : "Sign in"}</button>
      </form>
    );
  }

  return (
    <form action={send} className="stack">
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={sending}>{sending ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
  );
}
