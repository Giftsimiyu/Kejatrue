"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../backend/supabase/client";

type DashboardAccountActionsProps = {
  isAuthenticated?: boolean;
  showProfile?: boolean;
};

export default function DashboardAccountActions({
  isAuthenticated = true,
  showProfile = true,
}: DashboardAccountActionsProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function signOut() {
    setIsSigningOut(true);
    setErrorMessage("");

    try {
      const { error } = await createClient().auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/auth?mode=sign-in");
      router.refresh();
    } catch (error) {
      console.error("Failed to sign out.", error);
      setErrorMessage("We couldn’t sign you out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="dashboard-account-actions">
      {!isAuthenticated ? (
        <Link className="dashboard-account-link" href="/auth?mode=sign-in">
          Sign in
        </Link>
      ) : (
        <>
          {showProfile && (
            <Link className="dashboard-account-link" href="/dashboard/profile">
              Profile
            </Link>
          )}
          <button
            className="dashboard-account-signout"
            type="button"
            onClick={signOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </>
      )}
      {errorMessage && (
        <span className="dashboard-account-error" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
