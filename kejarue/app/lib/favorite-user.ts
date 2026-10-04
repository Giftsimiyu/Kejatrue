import type { createClient } from "../backend/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

export async function getFavoriteUserIds(
  supabase: SupabaseClient,
  authUserId: string,
) {
  const { data: profile, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle();

  if (error) throw error;

  if (!profile) {
    throw new Error("Your account profile could not be found.");
  }

  return [authUserId];
}

export async function insertFavorite(
  supabase: SupabaseClient,
  userIds: string[],
  propertyId: string,
) {
  const userId = userIds[0];

  if (!userId) {
    throw new Error("No authenticated user was found.");
  }

  const { error } = await supabase
    .from("favorites")
    .upsert(
      {
        user_id: userId,
        property_id: propertyId,
      },
      {
        onConflict: "user_id,property_id",
        ignoreDuplicates: true,
      },
    );

  if (error) throw error;
}