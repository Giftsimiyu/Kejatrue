import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter, SiteNavbar } from "./site-chrome";
import {
  houseHunterNavigation,
  roles,
  workspaceNavigation,
  type RoleId,
} from "../lib/roles";
import DashboardAccountActions from "./dashboard-account-actions";

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
  const roleLabel = roles.find((item) => item.id === role)?.label;
  const navigation =
    role === "house-hunter" ? houseHunterNavigation : workspaceNavigation[role];

  return (
    <main className="dashboard-page">
      <SiteNavbar backHref="/dashboard">
        <div className="dashboard-user">
          <DashboardAccountActions />
        </div>
      </SiteNavbar>
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
