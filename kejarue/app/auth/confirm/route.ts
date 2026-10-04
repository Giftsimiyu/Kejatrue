import {
  type EmailOtpType,
} from "@supabase/supabase-js";

import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "../../backend/supabase/server";

export async function GET(
  request: NextRequest,
) {
  const requestUrl = new URL(request.url);

  const tokenHash =
    requestUrl.searchParams.get(
      "token_hash",
    );

  const type =
    requestUrl.searchParams.get(
      "type",
    ) as EmailOtpType | null;

  const requestedNext =
    requestUrl.searchParams.get(
      "next",
    );

  const nextPath =
    requestedNext?.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\")
      ? requestedNext
      : "/dashboard/profile?setup=1";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(
        "/auth?error=The%20verification%20link%20is%20invalid%20or%20incomplete.",
        requestUrl.origin,
      ),
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.error(
      "Email verification failed:",
      error,
    );

    return NextResponse.redirect(
      new URL(
        `/auth?error=${encodeURIComponent(
          "This verification link is invalid or has expired. Please request a new verification email.",
        )}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      nextPath,
      requestUrl.origin,
    ),
  );
}