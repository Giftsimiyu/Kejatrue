import { NextResponse } from "next/server";
import { createClient } from "../../backend/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedRole = requestUrl.searchParams.get("role");
  const role =
    requestedRole === "house-hunter" ||
    requestedRole === "agent" ||
    requestedRole === "landlord"
      ? requestedRole
      : null;

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth?error=Google%20sign-in%20was%20cancelled.", requestUrl.origin),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const message = error?.message ?? "Google sign-in could not be completed.";
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(message)}`, requestUrl.origin),
    );
  }

  if (role && !data.user.user_metadata?.role) {
    await supabase.auth.updateUser({ data: { role } });
  }

  const destination =
    (data.user.user_metadata?.role ?? role) === "house-hunter"
      ? "/?workspace=house-hunter"
      : "/dashboard";
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}