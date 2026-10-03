import type { createClient } from "../backend/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

export async function getFavoriteUserIds(
  supabase: SupabaseClient,
  authUserId: string,
) {
  const { data: profile, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error("Your account profile could not be found.");
  }

  return [...new Set([authUserId, profile.id])];
}

export async function insertFavorite(
  supabase: SupabaseClient,
  userIds: string[],
  propertyId: string,
) {
  let lastError: Error | null = null;

  for (const userId of userIds) {
    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      property_id: propertyId,
    });

    if (!error) {
      return;
    }

    lastError = error;
  }

  throw lastError ?? new Error("Unable to save this property.");
}
