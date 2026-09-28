import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile, toRoleId } from "../../lib/auth";

import { type RoleId, workspaceNavigation } from "../../lib/roles";

import { SiteFooter, SiteNavbar } from "../../components/site-chrome";

type DashboardProperty = {
  id: string;
  title: string | null;
  location: string | null;
  city: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  trust_score: number | null;
  verification_status: string | null;
  thumbnail: string | null;
  created_at: string;
};

const roleContent: Record<
  Exclude<RoleId, "house-hunter">,
  {
    eyebrow: string;
    title: string;
    description: string;
    propertyLabel: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  agent: {
    eyebrow: "Agent workspace",

    title: "Manage your listings with confidence.",

    description:
      "Keep your properties, enquiries and trust information in one place while giving house hunters a clearer picture.",

    propertyLabel: "Your listings",

    emptyTitle: "Your first listing starts here.",

    emptyDescription:
      "Add a property with accurate costs, useful details and photos. Your listing can then move through KejaTrue's verification process.",
  },

  landlord: {
    eyebrow: "Landlord workspace",

    title: "Show people the full picture.",

    description:
      "Manage your properties, respond to enquiries and build trust through accurate information about the homes you own.",

    propertyLabel: "Your properties",

    emptyTitle: "Add your first property.",

    emptyDescription:
      "Give prospective tenants more than a rent price. Add the property's costs, utilities, location and other information that helps them make an informed decision.",
  },
};

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return `KSh ${value.toLocaleString("en-KE")}`;
}

function formatStatus(status: string | null) {
  if (!status) {
    return "Pending";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "verified":
      return "workspace-status verified";

    case "rejected":
      return "workspace-status rejected";

    case "partially_verified":
      return "workspace-status partial";

    default:
      return "workspace-status pending";
  }
}

export default async function DashboardPage() {
  const { supabase, user, profile } = await getCurrentUserProfile();

  /*
   * A dashboard is only available to
   * authenticated users.
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

              <p>
                Your professional workspace is available after authentication.
              </p>
            </div>

            <Link href="/auth?mode=sign-in" className="dark-button">
              Sign in <span>↗</span>
            </Link>
          </div>
        </section>

        <SiteFooter />
      </main>
    );
  }

  /*
   * The database profile is the source
   * of truth for the user's role.
   */

  const selectedRole = toRoleId(profile?.role ?? user.user_metadata?.role);

  /*
   * House hunters have their own experience.
   * Never display the professional workspace
   * to them.
   */

  if (selectedRole === "house-hunter") {
    redirect("/");
  }

  const content = roleContent[selectedRole];

  const workspaceLinks = workspaceNavigation[selectedRole];

  /*
   * Load the user's properties.
   */

  const { data: propertiesData, error: propertiesError } = await supabase
    .from("properties")
    .select(
      `
          id,
          title,
          location,
          city,
          price,
          bedrooms,
          bathrooms,
          trust_score,
          verification_status,
          thumbnail,
          created_at
        `,
    )
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const properties = (propertiesData ?? []) as DashboardProperty[];

  /*
   * Basic workspace metrics.
   */

  const totalProperties = properties.length;

  const publishedProperties = properties.filter(
    (property) => property.verification_status !== "rejected",
  ).length;

  const pendingProperties = properties.filter(
    (property) => property.verification_status === "pending",
  ).length;

  const trustScores = properties
    .map((property) => property.trust_score)
    .filter((score): score is number => typeof score === "number");

  const averageTrust = trustScores.length
    ? Math.round(
        trustScores.reduce((total, score) => total + score, 0) /
          trustScores.length,
      )
    : null;

  /*
   * Display a Kenyan date.
   */

  const dateLabel = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="dashboard-page">
      {/* ======================================
          TOP NAVIGATION
      ======================================= */}

      <SiteNavbar backHref="/" backLabel="Back to KejaTrue">
        <div className="dashboard-user">
          <span className="avatar small">
            {String(profile?.full_name || user.email || "KT")
              .trim()
              .slice(0, 2)
              .toUpperCase()}
          </span>

          <span>{profile?.full_name || user.email}</span>

          <Link href="/dashboard/profile">Profile</Link>
        </div>
      </SiteNavbar>

      {/* ======================================
          WORKSPACE NAVIGATION
      ======================================= */}

      <section className="dashboard-content">
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

        {/* ====================================
            HEADER
        ===================================== */}

        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">{content.eyebrow}</span>

            <h1>{content.title}</h1>

            <p>{content.description}</p>
          </div>

          <div className="dashboard-date">{dateLabel}</div>
        </div>

        {/* ====================================
            QUICK ACTION
        ===================================== */}

        <div className="professional-quick-action">
          <div>
            <span className="eyebrow">Workspace action</span>

            <h2>Ready to add a property?</h2>

            <p>
              Give house hunters the information they need to understand your
              listing.
            </p>
          </div>

          <Link href="/dashboard/properties/new" className="dark-button">
            Add property <span>↗</span>
          </Link>
        </div>

        {/* ====================================
            METRICS
        ===================================== */}

        <div className="professional-metrics">
          <div className="professional-metric">
            <span className="eyebrow">{content.propertyLabel}</span>

            <strong>{totalProperties}</strong>

            <small>Total properties in your workspace</small>
          </div>

          <div className="professional-metric">
            <span className="eyebrow">Active listings</span>

            <strong>{publishedProperties}</strong>

            <small>Properties available through your account</small>
          </div>

          <div className="professional-metric">
            <span className="eyebrow">Verification</span>

            <strong>{pendingProperties}</strong>

            <small>Properties awaiting verification</small>
          </div>

          <div className="professional-metric">
            <span className="eyebrow">Trust signal</span>

            <strong>
              {averageTrust === null ? "—" : `${averageTrust}/100`}
            </strong>

            <small>Average trust score across your properties</small>
          </div>
        </div>

        {/* ====================================
            MAIN WORKSPACE
        ===================================== */}

        <div className="professional-grid">
          {/* ----------------------------------
              PROPERTIES
          ----------------------------------- */}

          <section className="professional-panel">
            <div className="professional-panel-heading">
              <div>
                <span className="eyebrow">Property portfolio</span>

                <h2>
                  {totalProperties === 0
                    ? "Start building your portfolio."
                    : "Your properties"}
                </h2>
              </div>

              {totalProperties > 0 && (
                <Link href="/dashboard/properties" className="text-button">
                  View all <span>↗</span>
                </Link>
              )}
            </div>

            {propertiesError && (
              <div className="professional-message">
                <strong>We couldn&apos;t load your properties.</strong>

                <p>Refresh the page and try again.</p>
              </div>
            )}

            {!propertiesError && properties.length === 0 && (
              <div className="professional-empty">
                <div className="professional-empty-mark">+</div>

                <span className="eyebrow">No properties yet</span>

                <h3>{content.emptyTitle}</h3>

                <p>{content.emptyDescription}</p>

                <Link href="/dashboard/properties/new" className="dark-button">
                  Add your first property
                  <span>↗</span>
                </Link>
              </div>
            )}

            {!propertiesError && properties.length > 0 && (
              <div className="professional-property-list">
                {properties.slice(0, 4).map((property) => (
                  <Link
                    href={`/dashboard/properties/${property.id}`}
                    className="professional-property"
                    key={property.id}
                  >
                    <div className="professional-property-image">
                      {property.thumbnail ? (
                        <img src={property.thumbnail} alt="" />
                      ) : (
                        <span>K</span>
                      )}
                    </div>

                    <div className="professional-property-info">
                      <strong>{property.title || "Untitled property"}</strong>

                      <span>
                        {[property.location, property.city]
                          .filter(Boolean)
                          .join(" · ") || "Location not reported"}
                      </span>

                      <small>
                        {formatCurrency(property.price)}
                        {" · "}
                        {property.bedrooms ?? 0} bed
                        {" · "}
                        {property.bathrooms ?? 0} bath
                      </small>
                    </div>

                    <div className="professional-property-status">
                      <span
                        className={getStatusClass(property.verification_status)}
                      >
                        {formatStatus(property.verification_status)}
                      </span>

                      <span className="property-trust">
                        {property.trust_score === null
                          ? "Trust —"
                          : `Trust ${Math.round(property.trust_score)}`}

                        <b>↗</b>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ----------------------------------
              RIGHT COLUMN
          ----------------------------------- */}

          <aside className="professional-side">
            {/* Quick links */}

            <section className="professional-side-panel">
              <span className="eyebrow">Workspace</span>

              <h2>What would you like to do?</h2>

              <div className="professional-actions">
                <Link href="/dashboard/properties/new">
                  <span>01</span>

                  <strong>Add a property</strong>

                  <b>↗</b>
                </Link>

                <Link href="/dashboard/properties">
                  <span>02</span>

                  <strong>Manage properties</strong>

                  <b>↗</b>
                </Link>

                <Link href="/dashboard/messages">
                  <span>03</span>

                  <strong>View messages</strong>

                  <b>↗</b>
                </Link>

                <Link href="/dashboard/analytics">
                  <span>04</span>

                  <strong>View analytics</strong>

                  <b>↗</b>
                </Link>
              </div>
            </section>

            {/* KejaTrue principle */}

            <section className="professional-principle">
              <span className="eyebrow">The KejaTrue principle</span>

              <h2>Better information builds better decisions.</h2>

              <p>
                A strong listing isn&apos;t just attractive. It helps a house
                hunter understand what living there could actually cost and feel
                like.
              </p>
            </section>
          </aside>
        </div>

        {/* ====================================
            LOWER WORKSPACE PROMPT
        ===================================== */}

        <section className="professional-bottom">
          <div>
            <span className="eyebrow">Build trust over time</span>

            <h2>
              Your KejaTrue profile grows with the quality of your information.
            </h2>
          </div>

          <div className="professional-bottom-copy">
            <p>
              Complete your profile, provide accurate property information and
              respond to enquiries to give prospective tenants a clearer
              experience.
            </p>

            <Link href="/dashboard/profile" className="text-button">
              Complete profile <span>↗</span>
            </Link>
          </div>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}
