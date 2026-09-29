export type Property = {
  id: string;
  slug: string;
  title: string;
  location: string;
  type: string;
  rent: number;
  total: number;
  bedrooms: number;
  bathrooms: number;
  water: string;
  network: string;
  image: string;
  accent: string;
  description: string;
  verified: boolean;
};

type PropertyRow = Record<string, unknown>;

function asText(value: unknown, fallback = "Not reported") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value) || 0;
}

export function mapProperty(row: PropertyRow): Property {
  const gallery = Array.isArray(row.gallery) ? row.gallery : [];
  const location = [row.location, row.city, row.country]
    .filter((value) => typeof value === "string" && value)
    .join(", ");
  const rent = asNumber(row.price ?? row.rent);
  const additionalCost =
    asNumber(row.service_charge) +
    asNumber(row.water_cost) +
    asNumber(row.electricity_cost) +
    asNumber(row.internet_cost);

  const propertyId = asText(row.id, crypto.randomUUID());

  return {
    id: propertyId,
    slug: asText(row.slug, propertyId),
    title: asText(row.title, "Untitled property"),
    location: location || "Location not reported",
    type: asText(row.property_type ?? row.listing_type, "Property"),
    rent,
    total: rent + additionalCost,
    bedrooms: asNumber(row.bedrooms),
    bathrooms: asNumber(row.bathrooms),
    water: asText(row.water_reliability ?? row.water),
    network: asText(row.network_quality ?? row.network),
    image: asText(row.thumbnail ?? gallery[0], ""),
    accent: "#c8947e",
    description: asText(row.description, "The full property story will appear as more verified information is collected."),
    verified: Boolean(row.verified ?? row.is_verified),
  };
}