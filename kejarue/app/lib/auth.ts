import { createClient } from "../backend/supabase/server";
import type { RoleId } from "./roles";

type DatabaseRole = "house_hunter" | "agent" | "landlord";

export function toRoleId(
  role: DatabaseRole | string | null | undefined,
): RoleId {
  const normalizedRole =
    typeof role === "string" ? role.trim().toLowerCase() : role;

  if (normalizedRole === "agent") return "agent";
  if (normalizedRole === "landlord") return "landlord";
  if (normalizedRole === "house_hunter" || normalizedRole === "house-hunter") {
    return "house-hunter";
  }

  return "house-hunter";
}

export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, avatar, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile,
  };
}