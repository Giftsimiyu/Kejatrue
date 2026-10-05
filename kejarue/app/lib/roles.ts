import type { IconType } from "react-icons";
import { HiHome, HiBuildingOffice2, HiKey } from "react-icons/hi2";

export function normalizeRole(value: string | null | undefined) {
  const normalizedValue =
    typeof value === "string"
      ? value.trim().toLowerCase().replace(/_/g, "-")
      : value;

  if (normalizedValue === "house-hunter") {
    return "house-hunter" as const;
  }

  if (normalizedValue === "agent" || normalizedValue === "landlord") {
    return normalizedValue;
  }

  return null;
}

export const roles = [
  {
    id: "house-hunter",
    label: "House hunter",
    description: "Find, compare and understand homes before you commit.",
    icon: HiHome,
  },
  {
    id: "agent",
    label: "Real estate agent",
    description: "Manage listings, enquiries and your professional reputation.",
    icon: HiBuildingOffice2,
  },
  {
    id: "landlord",
    label: "Landlord",
    description: "Manage your properties and see how they perform.",
    icon: HiKey,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  icon: IconType;
}>;

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