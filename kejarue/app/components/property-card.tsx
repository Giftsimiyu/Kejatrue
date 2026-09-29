import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Property } from "../lib/properties";

type PropertyCardProps = {
  property: Property;
  isSaved: boolean;
  onToggleSaved: (propertyId: string) => void;
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
}: PropertyCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/property/${property.slug || property.id}`);
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
          aria-label={`${isSaved ? "Remove" : "Save"} ${property.title}`}
          aria-pressed={isSaved}
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
            {property.bedrooms} bedroom{property.bedrooms > 1 ? "s" : ""}
          </span>
          <Link
            className="card-link"
            href={`/property/${property.slug || property.id}`}
          >
            View intelligence <span>↗</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
