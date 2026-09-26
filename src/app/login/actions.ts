"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";

export type AuthState = { error: string | null; message: string | null };

const GENERIC_CONFIG_ERROR =
  "Authentication is not configured. Add your Supabase URL and publishable key to .env.local.";

function readCredentials(formData: FormData): { email: string; password: string } | null {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (!email.trim() || !password) return null;
  return { email: email.trim(), password };
}

export async function signIn(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isConfigured()) return { error: GENERIC_CONFIG_ERROR, message: null };

  const credentials = readCredentials(formData);
  if (!credentials) {
    return { error: "Enter both an email address and a password.", message: null };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    // Supabase deliberately does not distinguish "no such user" from "wrong
    // password", and neither should we — doing so would let anyone enumerate
    // which email addresses have accounts.
    return { error: "Those credentials were not recognised.", message: null };
  }

  revalidatePath("/", "layout");
  redirect("/favorites");
}

export async function signUp(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isConfigured()) return { error: GENERIC_CONFIG_ERROR, message: null };

  const credentials = readCredentials(formData);
  if (!credentials) {
    return { error: "Enter both an email address and a password.", message: null };
  }
  if (credentials.password.length < 8) {
    return { error: "Choose a password of at least 8 characters.", message: null };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp(credentials);

  if (error) {
    return { error: error.message, message: null };
  }

  // When email confirmation is enabled, Supabase returns a user with no
  // session. Saying "check your inbox" when confirmation is off would be
  // wrong, so branch on what actually came back.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/favorites");
  }

  return {
    error: null,
    message:
      "Account created. Check your email for a confirmation link before signing in.",
  };
}

export async function signOut(): Promise<void> {
  if (!isConfigured()) redirect("/");

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
