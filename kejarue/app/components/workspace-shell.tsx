"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { SiteFooter, SiteNavbar } from "./site-chrome";
import {
  houseHunterNavigation,
  roles,
  workspaceNavigation,
  type RoleId,
} from "../lib/roles";

import { createClient } from "../backend/supabase/client";

type WorkspaceShellProps = {
  role: RoleId;
  activeHref: string;
  children: ReactNode;
};

export function WorkspaceShell({
  role,
  activeHref,
  children,
}: WorkspaceShellProps) {
  const router = useRouter();
  const supabase = createClient();

  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const roleLabel = roles.find((item) => item.id === role)?.label;

  const navigation =
    role === "house-hunter" ? houseHunterNavigation : workspaceNavigation[role];

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      setSignOutError("Unable to sign out. Please try again.");
      setSigningOut(false);
      return;
    }

    router.replace("/auth?mode=sign-in");
    router.refresh();
  };

  return (
    <main className="dashboard-page">
      <SiteNavbar backHref="/dashboard">
        <div className="dashboard-user">
          <span className="avatar small">GS</span>

          <span>Gift Mumbi Simiyu</span>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-button"
            aria-label="Sign out"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </SiteNavbar>

      {signOutError && (
        <div
          role="alert"
          className="mx-auto mt-4 w-full max-w-7xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {signOutError}
        </div>
      )}

      <section className="workspace-section-content">
        <nav className="workspace-nav" aria-label={`${roleLabel} navigation`}>
          {navigation.map((item) => (
            <Link
              href={item.href}
              className={item.href === activeHref ? "active" : ""}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {children}
      </section>

      <SiteFooter />
    </main>
  );
}
