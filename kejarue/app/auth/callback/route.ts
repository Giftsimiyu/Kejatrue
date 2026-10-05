import { NextResponse } from "next/server";
import { createClient } from "../../backend/supabase/server";
import { normalizeRole, type RoleId } from "../../lib/roles";

function isValidRole(value: string | null): value is RoleId {
  return normalizeRole(value) !== null;
}

function toDatabaseRole(role: RoleId) {
  return role === "house-hunter" ? "house_hunter" : role;
}

export async function GET(
  request: Request
) {
  const requestUrl =
    new URL(request.url);

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  const requestedRole =
    requestUrl.searchParams.get(
      "role"
    );

  const requestedNext =
    requestUrl.searchParams.get(
      "next"
    );

  const nextPath =
    requestedNext?.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\")
      ? requestedNext
      : null;

  const role = isValidRole(
    requestedRole
  )
    ? requestedRole
    : null;

  // --------------------------------------------------
  // Google did not return an authorization code
  // --------------------------------------------------

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/auth?error=Google%20sign-in%20was%20cancelled.",
        requestUrl.origin
      )
    );
  }

  const supabase =
    await createClient();

  // --------------------------------------------------
  // Exchange Google's code for a Supabase session
  // --------------------------------------------------

  const {
    data,
    error,
  } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (
    error ||
    !data.user
  ) {
    const message =
      error?.message ??
      "Google sign-in could not be completed.";

    return NextResponse.redirect(
      new URL(
        `/auth?error=${encodeURIComponent(
          message
        )}`,
        requestUrl.origin
      )
    );
  }

  let finalRole: RoleId =
    role ?? "house-hunter";

  // --------------------------------------------------
  // Existing Google user
  //
  // If the account already has a role, preserve it.
  // --------------------------------------------------

  const existingRole =
    data.user.user_metadata
      ?.role;

  if (
    isValidRole(existingRole)
  ) {
    finalRole = existingRole;
  }

  // --------------------------------------------------
  // Save the selected role in Supabase Auth metadata.
  //
  // The database trigger then synchronizes
  // public.users.role.
  // --------------------------------------------------

  if (
    data.user.user_metadata
      ?.role !== finalRole
  ) {
    const {
      error: updateError,
    } =
      await supabase.auth.updateUser(
        {
          data: {
            role: finalRole,
          },
        }
      );

    if (updateError) {
      return NextResponse.redirect(
        new URL(
          `/auth?error=${encodeURIComponent(
            updateError.message
          )}`,
          requestUrl.origin
        )
      );
    }
  }

  // --------------------------------------------------
  // Explicitly make sure public.users has the
  // correct role.
  //
  // This also handles accounts created before the
  // synchronization trigger existed.
  // --------------------------------------------------

  const databaseRole =
    toDatabaseRole(finalRole);

  const {
    error: profileError,
  } = await supabase
    .from("users")
    .update({
      role: databaseRole,
      email: data.user.email,
      full_name:
        data.user.user_metadata
          ?.full_name ??
        data.user.user_metadata
          ?.name ??
        data.user.email
          ?.split("@")[0],
      avatar:
        data.user.user_metadata
          ?.avatar_url ??
        null,
      updated_at: new Date().toISOString(),
    })
    .eq(
      "auth_user_id",
      data.user.id
    );

  if (profileError) {
    return NextResponse.redirect(
      new URL(
        `/auth?error=${encodeURIComponent(
          "Your account was created, but your KejaTrue profile could not be synchronized."
        )}`,
        requestUrl.origin
      )
    );
  }

  // --------------------------------------------------
  // Redirect according to the actual role
  // --------------------------------------------------

  if (nextPath) {
    return NextResponse.redirect(
      new URL(
        nextPath,
        requestUrl.origin
      )
    );
  }

  if (
    finalRole ===
    "house-hunter"
  ) {
    return NextResponse.redirect(
      new URL(
        "/?workspace=house-hunter",
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(
      "/dashboard",
      requestUrl.origin
    )
  );
}