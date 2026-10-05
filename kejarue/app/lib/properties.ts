export type PropertyUnitSummary = {
  id: string;
  unit_label: string;
  floor_label: string | null;
  status:
    | "available"
    | "reserved"
    | "occupied"
    | "unavailable";
  rent_override: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
};

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

  trust_score: number | null;
  safety_score: number | null;
  water_score: number | null;
  network_score: number | null;

  listing_type: string;
  property_units: PropertyUnitSummary[];
};

type PropertyRow = Record<string, any>;

function asText(
  value: unknown,
  fallback = "Not reported",
) {
  return typeof value === "string" &&
    value.trim()
    ? value
    : fallback;
}

function asNumber(value: unknown) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export function mapProperty(
  row: PropertyRow,
): Property {
  const gallery = Array.isArray(
    row.gallery,
  )
    ? row.gallery
    : [];

  const location = [
    row.location,
    row.city,
    row.country,
  ]
    .filter(
      (value) =>
        typeof value === "string" &&
        value.trim(),
    )
    .join(", ");

  const rent = asNumber(
    row.price ?? row.rent,
  );

  const additionalCost =
    asNumber(row.service_charge) +
    asNumber(row.water_cost) +
    asNumber(row.electricity_cost) +
    asNumber(row.internet_cost);

  const propertyId = asText(
    row.id,
    crypto.randomUUID(),
  );

  const units: PropertyUnitSummary[] =
    Array.isArray(row.property_units)
      ? row.property_units.map(
          (unit: any) => ({
            id: unit.id,
            unit_label: unit.unit_label,
            floor_label:
              unit.floor_label ?? null,
            status: unit.status,
            rent_override:
              unit.rent_override !== null &&
              unit.rent_override !== undefined
                ? Number(
                    unit.rent_override,
                  )
                : null,
            bedrooms:
              unit.bedrooms !== null &&
              unit.bedrooms !== undefined
                ? Number(unit.bedrooms)
                : null,
            bathrooms:
              unit.bathrooms !== null &&
              unit.bathrooms !== undefined
                ? Number(unit.bathrooms)
                : null,
            area_sqft:
              unit.area_sqft !== null &&
              unit.area_sqft !== undefined
                ? Number(unit.area_sqft)
                : null,
          }),
        )
      : [];

  return {
    id: propertyId,

    slug: asText(
      row.slug,
      propertyId,
    ),

    title: asText(
      row.title,
      "Untitled property",
    ),

    location:
      location ||
      "Location not reported",

    type: asText(
      row.property_type ??
        row.listing_type,
      "Property",
    ),

    rent,

    total:
      asNumber(
        row.true_monthly_cost,
      ) ||
      rent + additionalCost,

    bedrooms:
      asNumber(row.bedrooms),

    bathrooms:
      asNumber(row.bathrooms),

    water: asText(
      row.water_reliability ??
        row.water,
    ),

    network: asText(
      row.network_quality ??
        row.network,
    ),

    image: asText(
      row.thumbnail ??
        gallery[0],
      "",
    ),

    accent: "#c8947e",

    description: asText(
      row.description,
      "The full property story will appear as more verified information is collected.",
    ),

    verified:
      row.verification_status ===
        "verified" ||
      Boolean(row.verified),

    trust_score:
      row.trust_score === null ||
      row.trust_score === undefined
        ? null
        : Number(row.trust_score),

    safety_score:
      row.safety_score === null ||
      row.safety_score === undefined
        ? null
        : Number(row.safety_score),

    water_score:
      row.water_score === null ||
      row.water_score === undefined
        ? null
        : Number(row.water_score),

    network_score:
      row.network_score === null ||
      row.network_score === undefined
        ? null
        : Number(row.network_score),

    listing_type: asText(
      row.listing_type,
      "rent",
    ),

    property_units: units,
  };
}