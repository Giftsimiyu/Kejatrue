export const roles = [
  {
    id: "house-hunter",
    label: "House hunter",
    description: "Find, compare and understand homes before you commit.",
    icon: "⌂",
  },
  {
    id: "agent",
    label: "Real estate agent",
    description: "Manage listings, enquiries and your professional reputation.",
    icon: "▦",
  },
  {
    id: "landlord",
    label: "Landlord",
    description: "Manage your properties and see how they perform.",
    icon: "⌂",
  },
] as const;

export type RoleId = (typeof roles)[number]["id"];

export type WorkspaceSection =
  | "properties"
  | "messages"
  | "analytics"
  | "profile"
  | "favorites";

export const workspaceNavigation: Record<
  Exclude<RoleId, "house-hunter">,
  { label: string; href: string; section?: WorkspaceSection }[]
> = {
  agent: [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Properties",
    href: "/dashboard/properties",
    section: "properties",
  },
  {
    label: "Viewing Requests",
    href: "/dashboard/visits",
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    section: "messages",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    section: "analytics",
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    section: "profile",
  },
],
  landlord: [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Properties",
    href: "/dashboard/properties",
    section: "properties",
  },
  {
    label: "Viewing Requests",
    href: "/dashboard/visits",
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    section: "messages",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    section: "analytics",
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    section: "profile",
  },
],
};

export const houseHunterNavigation = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Find homes",
    href: "/listings",
  },
  {
    label: "Saved",
    href: "/dashboard/favorites",
  },
  {
    label: "My visits",
    href: "/dashboard/visits/my",
  },
  {
    label: "Compare",
    href: "/compare",
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
  },
  {
    label: "Tools",
    href: "/tools/budget",
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
  },
];