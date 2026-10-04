"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../backend/supabase/client";
import { SiteFooter, SiteNavbar } from "../../../components/site-chrome";
import DashboardAccountActions from "../../../components/dashboard-account-actions";

type DraftProperty = {
  id: string;
  title: string | null;
  slug: string | null;
  location: string | null;
  city: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  thumbnail: string | null;
  verification_status: string | null;
  updated_at: string | null;
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  return `KSh ${new Intl.NumberFormat("en-KE").format(value)}`;
}

export default function DraftPropertiesPage() {
  const supabase = createClient();

  const [drafts, setDrafts] = useState<DraftProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDrafts() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (mounted) {
          setErrorMessage("Please sign in to view your drafts.");
          setLoading(false);
        }

        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .select(
          "id,title,slug,location,city,price,bedrooms,bathrooms,thumbnail,verification_status,updated_at",
        )
        .eq("owner_id", user.id)
        .eq("verification_status", "draft")
        .order("updated_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setErrorMessage(error.message || "We could not load your drafts.");
        setLoading(false);
        return;
      }

      setDrafts((data ?? []) as DraftProperty[]);
      setLoading(false);
    }

    loadDrafts();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <div className="site-shell dashboard-properties-page">
      <SiteNavbar>
        <DashboardAccountActions />
      </SiteNavbar>

      <main className="dashboard-properties-main">
        <section className="dashboard-page-heading">
          <div>
            <div className="dashboard-breadcrumb">
              <Link href="/dashboard">Workspace</Link>
              <span>/</span>
              <Link href="/dashboard/properties">Properties</Link>
              <span>/</span>
              <span>Drafts</span>
            </div>

            <p className="dashboard-eyebrow">DRAFTS</p>
            <h1>Unpublished listings</h1>
            <p className="dashboard-page-description">
              These properties are saved but not yet visible to house hunters.
            </p>
          </div>

          <div className="dashboard-heading-actions">
            <Link
              href="/dashboard/properties"
              className="dashboard-secondary-button"
            >
              Back to property list
            </Link>
          </div>
        </section>

        {errorMessage ? (
          <section className="dashboard-message-card dashboard-message-card--error">
            <div className="dashboard-message-icon">!</div>
            <div>
              <h2>Could not load drafts</h2>
              <p>{errorMessage}</p>
            </div>
          </section>
        ) : null}

        {loading ? (
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
        ) : drafts.length === 0 ? (
          <section className="property-empty-state">
            <div className="property-empty-icon">✎</div>
            <p className="dashboard-eyebrow">NO DRAFTS</p>
            <h2>You do not have any unpublished listings.</h2>
            <p>
              Save a property as a draft to keep it private before publishing
              it.
            </p>
            <Link
              href="/dashboard/properties/new"
              className="dashboard-primary-button"
            >
              Add a property
            </Link>
          </section>
        ) : (
          <section className="property-list-section">
            <div className="property-card-grid">
              {drafts.map((property) => (
                <article className="property-management-card" key={property.id}>
                  <div className="property-card-media">
                    {property.thumbnail ? (
                      <img
                        src={property.thumbnail}
                        alt={property.title || "Draft property"}
                      />
                    ) : (
                      <div className="property-card-placeholder">
                        <span>✎</span>
                        <small>Draft listing</small>
                      </div>
                    )}

                    <div className="property-card-media-top">
                      <span className="property-status property-status--pending">
                        Draft
                      </span>
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
                    </div>

                    <div className="property-price-row">
                      <div>
                        <strong>{formatCurrency(property.price)}</strong>
                        <span>/ month</span>
                      </div>
                    </div>

                    <div className="property-details-row">
                      <span>
                        <strong>{property.bedrooms ?? "—"}</strong> beds
                      </span>
                      <span>
                        <strong>{property.bathrooms ?? "—"}</strong> baths
                      </span>
                    </div>

                    <div className="property-card-actions">
                      <Link
                        href={`/dashboard/properties/${property.id}`}
                        className="dashboard-primary-button dashboard-primary-button--small"
                      >
                        Edit draft
                      </Link>

                      <Link
                        href={
                          property.slug
                            ? `/property/${property.slug}`
                            : `/property/${property.id}`
                        }
                        className="dashboard-secondary-button dashboard-secondary-button--small"
                      >
                        Preview
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
