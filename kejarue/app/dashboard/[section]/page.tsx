import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../backend/supabase/server";
import { WorkspaceShell } from "../../components/workspace-shell";
import { mapProperty, type Property } from "../../lib/properties";
import {
  houseHunterNavigation,
  roles,
  type RoleId,
  type WorkspaceSection,
} from "../../lib/roles";

type SectionPageProps = {
  params: Promise<{ section: string }>;
};

const sectionContent: Record<
  WorkspaceSection,
  {
    eyebrow: string;
    title: string;
    intro: string;
    action?: { label: string; href: string };
  }
> = {
  properties: {
    eyebrow: "Property workspace",
    title: "Keep every property in view.",
    intro:
      "Create listings, update the details people need and keep your published homes accurate.",
    action: { label: "Add a property", href: "/dashboard/properties/new" },
  },
  messages: {
    eyebrow: "Messages",
    title: "Stay close to every conversation.",
    intro:
      "Questions from house hunters and updates about your properties will collect here.",
  },
  analytics: {
    eyebrow: "Property analytics",
    title: "Understand what is working.",
    intro:
      "Track attention, enquiries and the signals that help you improve each listing.",
  },
  profile: {
    eyebrow: "Your profile",
    title: "Make your workspace feel like yours.",
    intro:
      "Keep your contact details and professional information ready for the people you work with.",
  },
  favorites: {
    eyebrow: "Favorites",
    title: "Keep the homes worth returning to.",
    intro:
      "Your favorite properties will live here once favorites are connected to your account.",
  },
};

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function isRole(value: unknown): value is RoleId {
  return value === "house-hunter" || value === "agent" || value === "landlord";
}

export default async function WorkspaceSectionPage({
  params,
}: SectionPageProps) {
  const { section } = await params;
  if (!Object.hasOwn(sectionContent, section)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userRole = user?.user_metadata?.role;
  const role = isRole(userRole) ? userRole : "house-hunter";
  const allowedSections =
    role === "house-hunter"
      ? houseHunterNavigation.map((item) => item.href.split("/").pop())
      : ["properties", "messages", "analytics", "profile"];
  if (!allowedSections.includes(section)) notFound();
  const content = sectionContent[section as WorkspaceSection];
  const roleLabel = roles.find((item) => item.id === role)?.label;

  const { data: propertyRows } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
  const properties = (propertyRows ?? []).map(mapProperty);

  return (
    <WorkspaceShell role={role} activeHref={`/dashboard/${section}`}>
      <div className="workspace-section-heading">
        <div>
          <span className="eyebrow">
            {roleLabel} · {content.eyebrow}
          </span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </div>
        {content.action && (
          <Link href={content.action.href} className="dark-button">
            {content.action.label} <span>↗</span>
          </Link>
        )}
      </div>
      {section === "properties" && <PropertiesPanel properties={properties} />}
      {section === "messages" && <MessagesPanel />}
      {section === "analytics" && <AnalyticsPanel properties={properties} />}
      {section === "profile" && (
        <ProfilePanel email={user?.email} role={roleLabel} />
      )}
      {section === "favorites" && <FavoritesPanel />}
    </WorkspaceShell>
  );
}

function PropertiesPanel({ properties }: { properties: Property[] }) {
  return (
    <div className="workspace-panel">
      <div className="workspace-panel-heading">
        <div>
          <span className="eyebrow">Published inventory</span>
          <h2>
            {properties.length
              ? `${properties.length} properties`
              : "No properties yet"}
          </h2>
        </div>
        <Link href="/dashboard/properties/new" className="text-button">
          Add another <span>↗</span>
        </Link>
      </div>
      {properties.length ? (
        <div className="workspace-property-list">
          {properties.map((property) => (
            <Link
              href={`/property/${property.id}`}
              className="workspace-property"
              key={property.id}
            >
              <div>
                <strong>{property.title}</strong>
                <span>
                  {property.location} · {property.type}
                </span>
              </div>
              <div>
                <strong>{money.format(property.total)}</strong>
                <span>
                  {property.verified ? "Verified" : "Needs verification"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="workspace-empty-state compact">
          <span className="state-mark">＋</span>
          <h2>Publish your first property.</h2>
          <p>Add the facts people need to make a confident decision.</p>
        </div>
      )}
    </div>
  );
}

function MessagesPanel() {
  return (
    <div className="workspace-panel">
      <div className="workspace-panel-heading">
        <div>
          <span className="eyebrow">Inbox</span>
          <h2>Your conversations</h2>
        </div>
        <span className="workspace-count">0 new</span>
      </div>
      <div className="workspace-empty-state compact">
        <span className="state-mark">⌁</span>
        <h2>No messages yet.</h2>
        <p>Enquiries and property conversations will appear here.</p>
      </div>
    </div>
  );
}

function AnalyticsPanel({ properties }: { properties: Property[] }) {
  const verified = properties.filter((property) => property.verified).length;
  const averageRent = properties.length
    ? properties.reduce((total, property) => total + property.rent, 0) /
      properties.length
    : 0;

  return (
    <div className="workspace-metric-grid">
      <div className="workspace-metric">
        <span>Published properties</span>
        <strong>{properties.length}</strong>
        <small>Across your workspace</small>
      </div>
      <div className="workspace-metric">
        <span>Verified listings</span>
        <strong>{verified}</strong>
        <small>Ready to build trust</small>
      </div>
      <div className="workspace-metric">
        <span>Average monthly rent</span>
        <strong>{money.format(averageRent)}</strong>
        <small>Based on published data</small>
      </div>
    </div>
  );
}

function ProfilePanel({ email, role }: { email?: string; role?: string }) {
  return (
    <div className="workspace-panel profile-panel">
      <span className="eyebrow">Account details</span>
      <h2>{email || "Your KejaTrue account"}</h2>
      <div className="profile-details">
        <div>
          <span>Role</span>
          <strong>{role}</strong>
        </div>
        <div>
          <span>Account status</span>
          <strong>Active workspace</strong>
        </div>
      </div>
      <Link href="/auth" className="text-button">
        Manage sign-in <span>↗</span>
      </Link>
    </div>
  );
}

function FavoritesPanel() {
  return (
    <div className="workspace-panel profile-panel">
      <span className="eyebrow">Saved for later</span>
      <h2>Your favorite homes will appear here.</h2>
      <p>
        Save a property from the listings page and we will keep it close while
        you compare your options.
      </p>
      <Link href="/listings" className="dark-button">
        Explore listings <span>↗</span>
      </Link>
    </div>
  );
}
