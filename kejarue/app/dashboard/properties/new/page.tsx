"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../backend/supabase/client";
import { SiteFooter, SiteNavbar } from "../../../components/site-chrome";

type Property = {
  id: string;
  title: string;
  slug: string | null;
  location: string | null;
  city: string | null;
  property_type: string | null;
  listing_type: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  thumbnail: string | null;
  verification_status:
    | "pending"
    | "partially_verified"
    | "verified"
    | "rejected"
    | null;
  trust_score: number | null;
  safety_score: number | null;
  water_score: number | null;
  network_score: number | null;
  true_monthly_cost: number | null;
  featured: boolean | null;
  created_at: string;
  updated_at: string;
};

type FilterType = "all" | "verified" | "pending";

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  return `KSh ${new Intl.NumberFormat("en-KE").format(value)}`;
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-KE").format(value);
}

function getVerificationLabel(status: Property["verification_status"]) {
  switch (status) {
    case "verified":
      return "Verified";
    case "partially_verified":
      return "Partially verified";
    case "rejected":
      return "Rejected";
    case "pending":
    default:
      return "Pending verification";
  }
}

function getVerificationClass(status: Property["verification_status"]) {
  switch (status) {
    case "verified":
      return "property-status property-status--verified";

    case "partially_verified":
      return "property-status property-status--partial";

    case "rejected":
      return "property-status property-status--rejected";

    case "pending":
    default:
      return "property-status property-status--pending";
  }
}

function getScoreClass(score: number | null) {
  if (score === null || score === undefined) {
    return "score score--empty";
  }

  if (score >= 80) {
    return "score score--high";
  }

  if (score >= 60) {
    return "score score--medium";
  }

  return "score score--low";
}

function getScoreLabel(score: number | null) {
  if (score === null || score === undefined) {
    return "—";
  }

  return `${Math.round(score)}`;
}

export default function PropertiesPage() {
  const supabase = createClient();

  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProperties() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (mounted) {
          setErrorMessage(
            "Your session could not be verified. Please sign in again.",
          );
          setLoading(false);
        }

        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        if (mounted) {
          setErrorMessage("We could not load your account profile.");
          setLoading(false);
        }

        return;
      }

      if (profile?.role !== "agent" && profile?.role !== "landlord") {
        window.location.href = "/";
        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .select(
          `
            id,
            title,
            slug,
            location,
            city,
            property_type,
            listing_type,
            price,
            bedrooms,
            bathrooms,
            area_sqft,
            thumbnail,
            verification_status,
            trust_score,
            safety_score,
            water_score,
            network_score,
            true_monthly_cost,
            featured,
            created_at,
            updated_at
          `,
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (mounted) {
          setErrorMessage(
            error.message || "We could not load your properties.",
          );
          setLoading(false);
        }

        return;
      }

      if (mounted) {
        setProperties((data ?? []) as Property[]);
        setLoading(false);
      }
    }

    loadProperties();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const filteredProperties = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesSearch =
        !normalizedSearch ||
        property.title?.toLowerCase().includes(normalizedSearch) ||
        property.location?.toLowerCase().includes(normalizedSearch) ||
        property.city?.toLowerCase().includes(normalizedSearch) ||
        property.property_type?.toLowerCase().includes(normalizedSearch);

      let matchesFilter = true;

      if (filter === "verified") {
        matchesFilter = property.verification_status === "verified";
      }

      if (filter === "pending") {
        matchesFilter =
          property.verification_status === "pending" ||
          property.verification_status === "partially_verified";
      }

      return matchesSearch && matchesFilter;
    });
  }, [properties, search, filter]);

  const metrics = useMemo(() => {
    const total = properties.length;

    const verified = properties.filter(
      (property) => property.verification_status === "verified",
    ).length;

    const pending = properties.filter(
      (property) =>
        property.verification_status === "pending" ||
        property.verification_status === "partially_verified",
    ).length;

    const trustScores = properties
      .map((property) => property.trust_score)
      .filter((score): score is number => typeof score === "number");

    const averageTrust =
      trustScores.length > 0
        ? trustScores.reduce((sum, score) => sum + score, 0) /
          trustScores.length
        : null;

    return {
      total,
      verified,
      pending,
      averageTrust,
    };
  }, [properties]);

  return (
    <div className="site-shell dashboard-properties-page">
      <SiteNavbar />

      <main className="dashboard-properties-main">
        <section className="dashboard-page-heading">
          <div>
            <div className="dashboard-breadcrumb">
              <Link href="/dashboard">Workspace</Link>

              <span>/</span>

              <span>Properties</span>
            </div>

            <p className="dashboard-eyebrow">PROPERTY PORTFOLIO</p>

            <h1>Properties</h1>

            <p className="dashboard-page-description">
              Manage your listings, monitor their transparency data, and keep
              your property information accurate.
            </p>
          </div>

          <div className="dashboard-heading-actions">
            <Link
              href="/dashboard/properties/drafts"
              className="dashboard-secondary-button"
            >
              Drafts
            </Link>

            <Link
              href="/dashboard/properties/new"
              className="dashboard-primary-button"
            >
              <span>+</span>
              Add property
            </Link>
          </div>
        </section>

        <section className="property-metrics-grid">
          <div className="property-metric-card">
            <span className="property-metric-label">Total properties</span>

            <strong>{loading ? "—" : metrics.total}</strong>

            <span className="property-metric-note">In your portfolio</span>
          </div>

          <div className="property-metric-card">
            <span className="property-metric-label">Verified</span>

            <strong>{loading ? "—" : metrics.verified}</strong>

            <span className="property-metric-note">Verification completed</span>
          </div>

          <div className="property-metric-card">
            <span className="property-metric-label">In progress</span>

            <strong>{loading ? "—" : metrics.pending}</strong>

            <span className="property-metric-note">
              Pending or partially verified
            </span>
          </div>

          <div className="property-metric-card">
            <span className="property-metric-label">Average trust</span>

            <strong>
              {loading
                ? "—"
                : metrics.averageTrust !== null
                  ? `${Math.round(metrics.averageTrust)}`
                  : "—"}
            </strong>

            <span className="property-metric-note">
              Based on property verification data
            </span>
          </div>
        </section>

        <section className="property-toolbar">
          <div className="property-search-wrapper">
            <span className="property-search-icon">⌕</span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search properties..."
              aria-label="Search properties"
            />
          </div>

          <div className="property-filter-group">
            <button
              type="button"
              className={
                filter === "all"
                  ? "property-filter-button property-filter-button--active"
                  : "property-filter-button"
              }
              onClick={() => setFilter("all")}
            >
              All
            </button>

            <button
              type="button"
              className={
                filter === "verified"
                  ? "property-filter-button property-filter-button--active"
                  : "property-filter-button"
              }
              onClick={() => setFilter("verified")}
            >
              Verified
            </button>

            <button
              type="button"
              className={
                filter === "pending"
                  ? "property-filter-button property-filter-button--active"
                  : "property-filter-button"
              }
              onClick={() => setFilter("pending")}
            >
              In progress
            </button>
          </div>
        </section>

        {errorMessage ? (
          <section className="dashboard-message-card dashboard-message-card--error">
            <div className="dashboard-message-icon">!</div>

            <div>
              <h2>Could not load properties</h2>

              <p>{errorMessage}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="dashboard-secondary-button"
              >
                Try again
              </button>
            </div>
          </section>
        ) : loading ? (
          <section className="property-loading-grid">
            {[1, 2, 3].map((item) => (
              <div className="property-skeleton-card" key={item}>
                <div className="property-skeleton-image" />

                <div className="property-skeleton-content">
                  <div className="property-skeleton-line property-skeleton-line--long" />
                  <div className="property-skeleton-line" />
                  <div className="property-skeleton-line property-skeleton-line--short" />
                </div>
              </div>
            ))}
          </section>
        ) : filteredProperties.length === 0 ? (
          <section className="property-empty-state">
            <div className="property-empty-icon">⌂</div>

            {properties.length === 0 ? (
              <>
                <p className="dashboard-eyebrow">YOUR PORTFOLIO</p>

                <h2>Your property portfolio starts here.</h2>

                <p>
                  Add your first property to begin publishing listings and
                  building transparent property information for house hunters.
                </p>

                <Link
                  href="/dashboard/properties/new"
                  className="dashboard-primary-button"
                >
                  Add your first property
                </Link>
              </>
            ) : (
              <>
                <p className="dashboard-eyebrow">NO MATCHES</p>

                <h2>No properties match your search.</h2>

                <p>
                  Try a different property name, location, or verification
                  filter.
                </p>

                <button
                  type="button"
                  className="dashboard-secondary-button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              </>
            )}
          </section>
        ) : (
          <section className="property-list-section">
            <div className="property-list-heading">
              <div>
                <p className="dashboard-eyebrow">LISTINGS</p>

                <h2>
                  {filteredProperties.length}{" "}
                  {filteredProperties.length === 1 ? "property" : "properties"}
                </h2>
              </div>

              <span className="property-list-count">
                Updated from your portfolio
              </span>
            </div>

            <div className="property-card-grid">
              {filteredProperties.map((property) => (
                <article className="property-management-card" key={property.id}>
                  <div className="property-card-media">
                    {property.thumbnail ? (
                      <img src={property.thumbnail} alt={property.title} />
                    ) : (
                      <div className="property-card-placeholder">
                        <span>⌂</span>
                        <small>No property image</small>
                      </div>
                    )}

                    <div className="property-card-media-top">
                      <span
                        className={getVerificationClass(
                          property.verification_status,
                        )}
                      >
                        {getVerificationLabel(property.verification_status)}
                      </span>

                      {property.featured ? (
                        <span className="property-featured-badge">
                          Featured
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="property-card-body">
                    <div className="property-card-title-row">
                      <div>
                        <h3>{property.title || "Untitled property"}</h3>

                        <p>
                          {property.location ||
                            property.city ||
                            "Location not provided"}
                        </p>
                      </div>

                      <div className="property-trust-badge">
                        <span>Trust</span>

                        <strong>{getScoreLabel(property.trust_score)}</strong>
                      </div>
                    </div>

                    <div className="property-price-row">
                      <div>
                        <strong>{formatCurrency(property.price)}</strong>

                        <span>/ month</span>
                      </div>

                      <span className="property-type-label">
                        {property.property_type || "Property"}
                      </span>
                    </div>

                    <div className="property-details-row">
                      <span>
                        <strong>{formatNumber(property.bedrooms)}</strong> beds
                      </span>

                      <span>
                        <strong>{formatNumber(property.bathrooms)}</strong>{" "}
                        baths
                      </span>

                      <span>
                        <strong>{formatNumber(property.area_sqft)}</strong> sqft
                      </span>
                    </div>

                    <div className="property-intelligence">
                      <div className="property-intelligence-heading">
                        <span>Property intelligence</span>

                        <span>
                          {property.true_monthly_cost
                            ? `${formatCurrency(
                                property.true_monthly_cost,
                              )} true monthly`
                            : "Cost data incomplete"}
                        </span>
                      </div>

                      <div className="property-score-grid">
                        <div>
                          <span>Trust</span>

                          <strong
                            className={getScoreClass(property.trust_score)}
                          >
                            {getScoreLabel(property.trust_score)}
                          </strong>
                        </div>

                        <div>
                          <span>Safety</span>

                          <strong
                            className={getScoreClass(property.safety_score)}
                          >
                            {getScoreLabel(property.safety_score)}
                          </strong>
                        </div>

                        <div>
                          <span>Water</span>

                          <strong
                            className={getScoreClass(property.water_score)}
                          >
                            {getScoreLabel(property.water_score)}
                          </strong>
                        </div>

                        <div>
                          <span>Network</span>

                          <strong
                            className={getScoreClass(property.network_score)}
                          >
                            {getScoreLabel(property.network_score)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="property-card-actions">
                      <Link
                        href={`/dashboard/properties/${property.id}`}
                        className="dashboard-primary-button dashboard-primary-button--small"
                      >
                        Manage property
                      </Link>

                      <Link
                        href={
                          property.slug
                            ? `/property/${property.slug}`
                            : `/property/${property.id}`
                        }
                        className="dashboard-secondary-button dashboard-secondary-button--small"
                      >
                        View listing
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="property-intelligence-banner">
          <div className="property-intelligence-banner-icon">✦</div>

          <div>
            <p className="dashboard-eyebrow">KEJATRUE INTELLIGENCE</p>

            <h2>Better property information builds renter confidence.</h2>

            <p>
              Keep verification, true monthly costs, safety, water and network
              information accurate. These signals help house hunters understand
              a property beyond its asking price.
            </p>
          </div>

          <Link
            href="/dashboard/properties/new"
            className="dashboard-secondary-button"
          >
            Add property data
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
