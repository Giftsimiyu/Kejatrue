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
  trust_score: number | null;
  thumbnail: string | null;
};

function formatCurrency(value: number | null) {
  return value === null ? "Not provided" : `KSh ${value.toLocaleString("en-KE")}`;
}

export default function ComparePage() {
  const [properties, setProperties] = useState<CompareProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProperties() {
      const stored = localStorage.getItem("kejarue_compare");
      const ids: string[] = stored ? JSON.parse(stored) : [];

      if (!ids.length) {
        setLoading(false);
        return;
      }

      const { data } = await createClient()
        .from("properties")
        .select(
          "id, slug, title, location, city, price, true_monthly_cost, bedrooms, bathrooms, trust_score, thumbnail",
        )
        .in("id", ids);

      const ordered = ids
        .map((id) => data?.find((property) => property.id === id))
        .filter((property): property is CompareProperty => Boolean(property));

      setProperties(ordered);
      setLoading(false);
    }

    void loadProperties();
  }, []);

  function clearComparison() {
    localStorage.removeItem("kejarue_compare");
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
            <span className="eyebrow">Property comparison</span>
            <h1>Compare homes with the details that matter.</h1>
            <p>
              Review rent, recurring costs and trust signals side by side before
              you decide.
            </p>
          </div>

          {properties.length > 0 && (
            <button type="button" className="secondary-button" onClick={clearComparison}>
              Clear comparison
            </button>
          )}
        </div>

        {loading ? (
          <div className="compare-empty">Loading your comparison...</div>
        ) : properties.length === 0 ? (
          <div className="compare-empty">
            <strong>No properties selected yet.</strong>
            <p>Add properties from their listing pages to compare them here.</p>
            <Link href="/listings" className="primary-button">
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="compare-grid">
            {properties.map((property) => (
              <article className="compare-card" key={property.id}>
                <div className="compare-card-image">
                  {property.thumbnail ? (
                    <img src={property.thumbnail} alt="" />
                  ) : (
                    <span>⌂</span>
                  )}
                </div>

                <div className="compare-card-body">
                  <span className="eyebrow">{property.location || property.city || "Location not provided"}</span>
                  <h2>{property.title || "Untitled property"}</h2>

                  <dl>
                    <div>
                      <dt>Monthly rent</dt>
                      <dd>{formatCurrency(property.price)}</dd>
                    </div>
                    <div>
                      <dt>True monthly cost</dt>
                      <dd>{formatCurrency(property.true_monthly_cost)}</dd>
                    </div>
                    <div>
                      <dt>Home facts</dt>
                      <dd>{property.bedrooms ?? "-"} bed · {property.bathrooms ?? "-"} bath</dd>
                    </div>
                    <div>
                      <dt>Trust score</dt>
                      <dd>{property.trust_score === null ? "Not scored" : `${Math.round(property.trust_score)}/100`}</dd>
                    </div>
                  </dl>

                  <Link
                    href={`/property/${property.slug || property.id}`}
                    className="primary-button compare-card-link"
                  >
                    View property <span>↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
