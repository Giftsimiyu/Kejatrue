import Link from "next/link";
import { getCurrentUserProfile, toRoleId } from "../lib/auth";
import { roles, type RoleId, workspaceNavigation } from "../lib/roles";
import { SiteFooter, SiteNavbar } from "../components/site-chrome";
import DashboardAccountActions from "../components/dashboard-account-actions";

const dashboardCopy: Record<
  RoleId,
  {
    title: string;
    intro: string;
    actions: {
      label: string;
      href: string;
    }[];
  }
> = {
  "house-hunter": {
    title: "Your home search, with more clarity.",
    intro:
      "Keep your shortlist, compare real costs and follow the homes that matter to you.",
    actions: [
      {
        label: "Saved homes",
        href: "/dashboard/favorites",
      },
      {
        label: "My preferences",
        href: "/dashboard/profile",
      },
      {
        label: "Compare properties",
        href: "/listings",
      },
    ],
  },

  agent: {
    title: "Your property work, in one view.",
    intro:
      "Manage your listings, enquiries and reputation from a single working space.",
    actions: [
      {
        label: "Add a property",
        href: "/dashboard/properties/new",
      },
      {
        label: "Manage listings",
        href: "/dashboard/properties",
      },
      {
        label: "View enquiries",
        href: "/dashboard/messages",
      },
    ],
  },

  landlord: {
    title: "See what your property is really saying.",
    intro:
      "Manage your homes, understand performance and build trust with better information.",
    actions: [
      {
        label: "Add a property",
        href: "/dashboard/properties/new",
      },
      {
        label: "Manage properties",
        href: "/dashboard/properties",
      },
      {
        label: "Review performance",
        href: "/dashboard/analytics",
      },
    ],
  },
};

export default async function DashboardPage() {
  const { supabase, user, profile } = await getCurrentUserProfile();

  /*
   * If the visitor is not authenticated,
   * show a simple sign-in prompt.
   */
  if (!user) {
    return (
      <main className="dashboard-page">
        <SiteNavbar backHref="/auth" backLabel="Sign in" />

        <section className="dashboard-content">
          <div className="dashboard-heading">
            <div>
              <span className="eyebrow">KejaTrue workspace</span>

              <h1>Sign in to continue.</h1>

              <p>Your dashboard is available after authentication.</p>
            </div>

            <Link href="/auth" className="dark-button">
              Sign in <span>↗</span>
            </Link>
          </div>
        </section>

        <SiteFooter />
      </main>
    );
  }

  /*
   * Get the role from the public.users table first.
   * Fall back to Supabase auth metadata if necessary.
   */
  const selectedRole = toRoleId(profile?.role ?? user.user_metadata?.role);

  const content = dashboardCopy[selectedRole];

  const workspaceLinks =
    selectedRole === "house-hunter" ? [] : workspaceNavigation[selectedRole];

  /*
   * Load real property information for
   * landlords and agents.
   */
  let propertyCount = 0;
  let averageTrust: number | null = null;

  if (selectedRole !== "house-hunter") {
    const { data: properties } = await supabase
      .from("properties")
      .select("id, trust_score")
      .eq("owner_id", user.id);

    propertyCount = properties?.length ?? 0;

    const trustScores =
      properties
        ?.map((property) =>
          typeof property.trust_score === "number"
            ? property.trust_score
            : null,
        )
        .filter((score): score is number => score !== null) ?? [];

    if (trustScores.length > 0) {
      averageTrust =
        trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length;
    }
  }

  /*
   * Display the current date
   * using Kenyan formatting.
   */
  const dateLabel = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date());

  const dateParts = dateLabel.split(",");

  return (
    <main className="dashboard-page">
      <SiteNavbar backHref="/" backLabel="Back to KejaTrue">
        <div className="dashboard-user">
          <span className="avatar small">
            {String(profile?.full_name || user.email || "KT")
              .trim()
              .slice(0, 2)
              .toUpperCase()}
          </span>

          <span>{profile?.full_name || user.email}</span>

          <DashboardAccountActions />
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
            {dateParts[0]}

            <br />

            <strong>{dateParts.slice(1).join(",").trim()}</strong>
          </div>
        </div>

        <div className="dashboard-stats">
          <div>
            <span className="eyebrow">Account</span>

            <strong>Connected</strong>

            <small>Your KejaTrue account is linked to Supabase.</small>
          </div>

          <div>
            <span className="eyebrow">
              {selectedRole === "house-hunter"
                ? "Saved homes"
                : "Your listings"}
            </span>

            <strong>{propertyCount}</strong>

            <small>
              {selectedRole === "house-hunter"
                ? "Homes you save will appear here."
                : "Properties currently owned by your account."}
            </small>
          </div>

          <div>
            <span className="eyebrow">Trust signal</span>

            <strong>
              {averageTrust === null ? "—" : `${averageTrust.toFixed(0)}/100`}
            </strong>

            <small>
              {averageTrust === null
                ? "Trust data appears after verification activity."
                : "Average trust score across your properties."}
            </small>
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
                  <span className="action-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

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
