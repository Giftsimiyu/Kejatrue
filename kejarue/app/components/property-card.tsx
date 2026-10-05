import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Property } from "../lib/properties";

type PropertyCardProps = {
  property: Property;
  isSaved: boolean;
  onToggleSaved: (propertyId: string) => void;
  isSaving?: boolean;
};

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export default function PropertyCard({
  property,
  isSaved,
  onToggleSaved,
  isSaving = false,
}: PropertyCardProps) {
  const router = useRouter();
  const propertyHref = `/property/${encodeURIComponent(
    property.slug || property.id,
  )}`;

  const handleCardClick = () => {
    router.push(propertyHref);
  };

  const handleSaveClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleSaved(property.id);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  const availableUnits =
    property.property_units?.filter((unit) => unit.status === "available") ??
    [];

  const reservedUnits =
    property.property_units?.filter((unit) => unit.status === "reserved") ?? [];

  const hasUnitInventory =
    property.property_units && property.property_units.length > 0;

  return (
    <article
      className="property-card"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open details for ${property.title}`}
    >
      <div
        className="property-image"
        style={{ backgroundImage: `url(${property.image})` }}
      >
        <span className="match-badge">
          {property.verified ? "Verified home" : "Worth a closer look"}
        </span>
        <button
          type="button"
          className={isSaved ? "save-button saved" : "save-button"}
          onClick={handleSaveClick}
          disabled={isSaving}
          aria-label={`${isSaved ? "Remove" : "Save"} ${property.title}`}
          aria-pressed={isSaved}
          aria-busy={isSaving}
        >
          {isSaved ? "♥" : "♡"}
        </button>
      </div>
      <div className="property-body">
        <div className="property-title-row">
          <div>
            <h3>{property.title}</h3>
            <p>{property.location}</p>
          </div>
          <span className="property-type">{property.type}</span>
        </div>
        <div className="cost-row">
          <div>
            <small>True monthly cost</small>
            <strong>{money.format(property.total)}</strong>
          </div>
          <div className="rent-note">Rent {money.format(property.rent)}</div>
        </div>
        <div className="intelligence-row">
          <span>
            <i style={{ backgroundColor: property.accent }} /> Water{" "}
            {property.water}
          </span>
          <span>
            <i style={{ backgroundColor: property.accent }} /> Network{" "}
            {property.network}
          </span>
        </div>
        <div className="card-footer">
          <span>
            {hasUnitInventory
              ? `${availableUnits.length} available unit${
                  availableUnits.length === 1 ? "" : "s"
                }`
              : `${property.bedrooms} bedroom${
                  property.bedrooms > 1 ? "s" : ""
                }`}
          </span>

          <Link className="card-link" href={propertyHref}>
            View intelligence <span>↗</span>
          </Link>
        </div>

        {hasUnitInventory && (
          <div className="mt-3 border-t border-black/10 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/45">
              Available units
            </div>

            <div className="flex flex-wrap gap-2">
              {availableUnits.slice(0, 5).map((unit) => (
                <span
                  key={unit.id}
                  className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium"
                >
                  {unit.unit_label}

                  {unit.rent_override
                    ? ` · KSh ${new Intl.NumberFormat("en-KE").format(
                        unit.rent_override,
                      )}`
                    : ""}
                </span>
              ))}

              {availableUnits.length > 5 && (
                <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                  +{availableUnits.length - 5} more
                </span>
              )}
            </div>

            {reservedUnits.length > 0 && (
              <p className="mt-2 text-xs text-black/45">
                {reservedUnits.length} currently reserved
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
