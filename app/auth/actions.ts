"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/auth/login?error=credentials");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/auth/login?error=credentials");
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!displayName || displayName.length > 80 || !email || password.length < 8) {
    redirect("/auth/sign-up?error=signup");
  }

  const origin = (await headers()).get("origin");

  if (!origin) {
    redirect("/auth/sign-up?error=signup");
  }

  const supabase = await createClient();
  const callbackUrl = new URL("/auth/callback", origin);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    redirect("/auth/sign-up?error=signup");
  }

  redirect(data.session ? "/dashboard" : "/auth/login?message=check-email");
}
