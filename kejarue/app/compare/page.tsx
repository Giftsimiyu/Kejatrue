"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "../backend/supabase/client";

type CompareProperty = {
  id: string;
  slug: string | null;
  title: string | null;
  location: string | null;
  city: string | null;
  price: number | null;
  true_monthly_cost: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  trust_score: number | null;
  safety_score: number | null;
  water_score: number | null;
  network_score: number | null;
  area_score: number | null;
  verification_status:
    | "pending"
    | "partially_verified"
    | "verified"
    | "rejected"
    | null;
  thumbnail: string | null;
};

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(Number(value))) {
    return "Not provided";
  }

  return `KSh ${Number(value).toLocaleString("en-KE")}`;
}

function formatScore(value: number | null) {
  if (value === null || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Math.round(Number(value))}/100`;
}

function formatVerification(
  value: CompareProperty["verification_status"],
) {
  if (value === "verified") return "Verified";
  if (value === "partially_verified") return "Partially verified";
  if (value === "rejected") return "Rejected";
  return "Pending";
}

function safeReadCompareIds(): string[] {
  try {
    const stored = localStorage.getItem("kejarue_compare");

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (value): value is string => typeof value === "string",
      )
      .slice(-4);
  } catch {
    return [];
  }
}

function ScoreCell({
  value,
}: {
  value: number | null;
}) {
  return (
    <span className="compare-score-cell">
      <strong>{formatScore(value)}</strong>

      {value !== null && (
        <span className="compare-score-bar">
          <span
            style={{
              width: `${Math.max(
                0,
                Math.min(100, Number(value)),
              )}%`,
            }}
          />
        </span>
      )}
    </span>
  );
}

export default function ComparePage() {
  const [properties, setProperties] = useState<CompareProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProperties() {
      const ids = safeReadCompareIds();

      if (!ids.length) {
        setLoading(false);
        return;
      }

      const { data, error } = await createClient()
        .from("properties")
        .select(
          "id,slug,title,location,city,price,true_monthly_cost,bedrooms,bathrooms,area_sqft,trust_score,safety_score,water_score,network_score,area_score,verification_status,thumbnail",
        )
        .in("id", ids);

      if (error) {
        setProperties([]);
        setLoading(false);
        return;
      }

      const ordered = ids
        .map((id) =>
          data?.find((property) => property.id === id),
        )
        .filter(
          (property): property is CompareProperty =>
            Boolean(property),
        );

      setProperties(ordered);
      setLoading(false);
    }

    void loadProperties();
  }, []);

  function persistIds(ids: string[]) {
    if (ids.length === 0) {
      localStorage.removeItem("kejarue_compare");
    } else {
      localStorage.setItem(
        "kejarue_compare",
        JSON.stringify(ids.slice(-4)),
      );
    }
  }

  function removeFromComparison(propertyId: string) {
    const updated = properties.filter(
      (property) => property.id !== propertyId,
    );

    persistIds(updated.map((property) => property.id));
    setProperties(updated);
  }

  function clearComparison() {
    persistIds([]);
    setProperties([]);
  }

  return (
    <main className="compare-page">
      <header className="site-navbar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark">K</span>
          <span>KejaTrue</span>
        </Link>

        <Link href="/listings" className="text-button">
          Back to listings <span>↗</span>
        </Link>
      </header>

      <section className="compare-content">
        <div className="compare-heading">
          <div>
            <span className="eyebrow">
              Property comparison
            </span>

            <h1>
              Compare homes with the details that matter.
            </h1>

            <p>
              Review rent, recurring costs, verification and
              property intelligence side by side before you
              decide.
            </p>
          </div>

          {properties.length > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={clearComparison}
            >
              Clear comparison
            </button>
          )}
        </div>

        {loading ? (
          <div className="compare-empty">
            <strong>Loading your comparison...</strong>

            <p>
              We are retrieving the properties you selected.
            </p>
          </div>
        ) : properties.length === 0 ? (
          <div className="compare-empty">
            <strong>No properties selected yet.</strong>

            <p>
              Add up to four properties from their listing pages
              to compare them here.
            </p>

            <Link
              href="/listings"
              className="primary-button"
            >
              Browse listings
            </Link>
          </div>
        ) : (
          <>
            <div className="compare-grid">
              {properties.map((property) => (
                <article
                  className="compare-card"
                  key={property.id}
                >
                  <div className="compare-card-image">
                    {property.thumbnail ? (
                      <img
                        src={property.thumbnail}
                        alt={
                          property.title || "Property"
                        }
                      />
                    ) : (
                      <span>⌂</span>
                    )}
                  </div>

                  <div className="compare-card-body">
                    <div className="compare-card-topline">
                      <span className="eyebrow">
                        {property.location ||
                          property.city ||
                          "Location not provided"}
                      </span>

                      <button
                        type="button"
                        className="compare-remove-button"
                        onClick={() =>
                          removeFromComparison(
                            property.id,
                          )
                        }
                        aria-label={`Remove ${
                          property.title || "property"
                        } from comparison`}
                      >
                        ×
                      </button>
                    </div>

                    <h2>
                      {property.title ||
                        "Untitled property"}
                    </h2>

                    <dl>
                      <div>
                        <dt>Monthly rent</dt>

                        <dd>
                          {formatCurrency(
                            property.price,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>True monthly cost</dt>

                        <dd>
                          {formatCurrency(
                            property.true_monthly_cost,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Home facts</dt>

                        <dd>
                          {property.bedrooms ?? "—"} bed ·{" "}
                          {property.bathrooms ?? "—"} bath
                        </dd>
                      </div>

                      <div>
                        <dt>Area</dt>

                        <dd>
                          {property.area_sqft
                            ? `${property.area_sqft.toLocaleString()} sq ft`
                            : "Not provided"}
                        </dd>
                      </div>

                      <div>
                        <dt>Verification</dt>

                        <dd>
                          {formatVerification(
                            property.verification_status,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Trust score</dt>

                        <dd>
                          <ScoreCell
                            value={property.trust_score}
                          />
                        </dd>
                      </div>

                      <div>
                        <dt>Safety</dt>

                        <dd>
                          <ScoreCell
                            value={property.safety_score}
                          />
                        </dd>
                      </div>

                      <div>
                        <dt>Water</dt>

                        <dd>
                          <ScoreCell
                            value={property.water_score}
                          />
                        </dd>
                      </div>

                      <div>
                        <dt>Network</dt>

                        <dd>
                          <ScoreCell
                            value={property.network_score}
                          />
                        </dd>
                      </div>

                      <div>
                        <dt>Area intelligence</dt>

                        <dd>
                          <ScoreCell
                            value={property.area_score}
                          />
                        </dd>
                      </div>
                    </dl>

                    <Link
                      href={`/property/${
                        property.slug || property.id
                      }`}
                      className="primary-button compare-card-link"
                    >
                      View property <span>↗</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <section className="compare-method-card">
              <span className="eyebrow">
                How to read the comparison
              </span>

              <h2>
                KejaTrue keeps the signals separate.
              </h2>

              <p>
                A trust score reflects verification evidence.
                Safety reflects available approved review data.
                Water, network and area scores use the property
                or area intelligence recorded for that location.
                True monthly cost combines rent with known
                recurring costs.
              </p>
            </section>
          </>
        )}
      </section>
    </main>
  );
}