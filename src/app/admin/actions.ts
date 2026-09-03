"use server";

import { redirect } from "next/navigation";
import { getNeonAuth } from "@/lib/neon/auth";
import { getAdminAccess } from "@/server/admin/authorization";

export interface AdminLoginState {
  readonly error: string | null;
}

const GENERIC_LOGIN_ERROR = "로그인 정보를 확인하거나 관리자 권한이 준비되었는지 확인해 주세요.";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signInAdmin(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = stringField(formData, "email");
  const password = formData.get("password");
  if (!email.includes("@") || typeof password !== "string" || password.length < 8) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  try {
    const result = await getNeonAuth().signIn.email({ email, password });
    if (result.error) return { error: GENERIC_LOGIN_ERROR };

    const access = await getAdminAccess();
    if (access.status === "authorized") redirect("/admin/analytics");

    await getNeonAuth().signOut();
    return { error: GENERIC_LOGIN_ERROR };
  } catch {
    return { error: GENERIC_LOGIN_ERROR };
  }
}

export async function signOutAdmin(): Promise<void> {
  try {
    await getNeonAuth().signOut();
  } finally {
    redirect("/admin/login");
  }
}
