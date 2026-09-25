import Link from "next/link";
import { createClient } from "../backend/supabase/server";
import { roles, type RoleId, workspaceNavigation } from "../lib/roles";
import { SiteFooter, SiteNavbar } from "../components/site-chrome";

const dashboardCopy: Record<
  RoleId,
  { title: string; intro: string; actions: { label: string; href: string }[] }
> = {
  "house-hunter": {
    title: "Your home search, with more clarity.",
    intro:
      "Keep your shortlist, compare real costs and follow the homes that matter to you.",
    actions: [
      { label: "Saved homes", href: "/" },
      { label: "My preferences", href: "/dashboard/profile" },
      { label: "Compare properties", href: "/" },
    ],
  },
  agent: {
    title: "Your property work, in one view.",
    intro:
      "Manage your listings, enquiries and reputation from a single working space.",
    actions: [
      { label: "Add a property", href: "/dashboard/properties/new" },
      { label: "Manage listings", href: "/dashboard/properties" },
      { label: "View enquiries", href: "/dashboard/messages" },
    ],
  },
  landlord: {
    title: "See what your property is really saying.",
    intro:
      "Manage your homes, understand performance and build trust with better information.",
    actions: [
      { label: "Add a property", href: "/dashboard/properties/new" },
      { label: "Manage properties", href: "/dashboard/properties" },
      { label: "Review performance", href: "/dashboard/analytics" },
    ],
  },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as RoleId) || "house-hunter";
  const selectedRole = roles.some((item) => item.id === role)
    ? role
    : "house-hunter";
  const content = dashboardCopy[selectedRole];
  const workspaceLinks =
    selectedRole === "house-hunter" ? [] : workspaceNavigation[selectedRole];

  return (
    <main className="dashboard-page">
      <SiteNavbar backHref="/dashboard">
        <div className="dashboard-user">
          <span className="avatar small">
            {user ? String(user.email).slice(0, 2).toUpperCase() : "KT"}
          </span>
          <span>{user?.email || "Guest workspace"}</span>
          <Link href="/auth">Sign in</Link>
        </div>
      </SiteNavbar>
      <section className="dashboard-content">
        {workspaceLinks.length > 0 && (
          <nav className="workspace-nav" aria-label="Workspace navigation">
            {workspaceLinks.map((item) => (
              <Link
                href={item.href}
                className={item.href === "/dashboard" ? "active" : ""}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">
              {roles.find((item) => item.id === selectedRole)?.label}
            </span>
            <h1>{content.title}</h1>
            <p>{content.intro}</p>
          </div>
          <div className="dashboard-date">
            Tuesday
            <br />
            <strong>22.09.26</strong>
          </div>
        </div>
        <div className="dashboard-stats">
          <div>
            <span className="eyebrow">Workspace status</span>
            <strong>Ready to build</strong>
            <small>Connect your account to your next action.</small>
          </div>
          <div>
            <span className="eyebrow">Published listings</span>
            <strong>0</strong>
            <small>Live data from your Supabase workspace.</small>
          </div>
          <div>
            <span className="eyebrow">Trust signal</span>
            <strong>—</strong>
            <small>Earned through verified activity.</small>
          </div>
        </div>
        <div className="dashboard-grid">
          <section className="dashboard-main">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Your next moves</span>
                <h2>Make the workspace yours</h2>
              </div>
            </div>
            <div className="action-grid">
              {content.actions.map((action, index) => (
                <Link
                  href={action.href}
                  className="dashboard-action"
                  key={action.label}
                >
                  <span className="action-number">0{index + 1}</span>
                  <strong>{action.label}</strong>
                  <span>↗</span>
                </Link>
              ))}
            </div>
          </section>
          <aside className="dashboard-aside">
            <span className="eyebrow">The KejaTrue principle</span>
            <h2>Good listings answer questions before they are asked.</h2>
            <p>
              Every property can become more useful when cost, utilities,
              verification and lived experience are visible together.
            </p>
            <Link href="/" className="text-button">
              Explore homes <span>↗</span>
            </Link>
          </aside>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
