"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { isAllowedEmail } from "@/lib/allowed";

export type LoginState = { step: "email" | "code"; email?: string; message?: string; error?: string };

export async function sendLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  if (!isAllowedEmail(email)) {
    return { step: "email", error: "That email isn't allowed to use this catalogue." };
  }
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { step: "email", error: error.message };
  return {
    step: "code",
    email,
    message: "Check your email. Tap the link, or type the 6-digit code here.",
  };
}

export async function verifyCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? prev.email ?? "").trim();
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!isAllowedEmail(email)) return { step: "email", error: "That email isn't allowed." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "code", email, error: "That code didn't work. Try again or resend." };
  redirect("/");
}
