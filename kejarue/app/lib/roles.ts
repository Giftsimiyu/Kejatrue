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
    { label: "Properties", href: "/dashboard/properties", section: "properties" },
    { label: "Messages", href: "/dashboard/messages", section: "messages" },
    { label: "Analytics", href: "/dashboard/analytics", section: "analytics" },
    { label: "Profile", href: "/dashboard/profile", section: "profile" },
  ],
  landlord: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Properties", href: "/dashboard/properties", section: "properties" },
    { label: "Messages", href: "/dashboard/messages", section: "messages" },
    { label: "Analytics", href: "/dashboard/analytics", section: "analytics" },
    { label: "Profile", href: "/dashboard/profile", section: "profile" },
  ],
};

export const houseHunterNavigation = [
  { label: "Home", href: "/" },
  { label: "Property listings", href: "/listings" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Budget calculator", href: "/tools/budget" },
  { label: "Bills calculator", href: "/tools/bills" },
  { label: "AI assistant", href: "/assistant" },
  { label: "Favorites", href: "/dashboard/favorites" },
  { label: "Messages", href: "/dashboard/messages" },
];