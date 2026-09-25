"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../backend/supabase/client";
import { mapProperty, type Property } from "../lib/properties";
import { BrandLink, SiteFooter } from "./site-chrome";
import PropertyCard from "./property-card";

export default function PropertyDiscovery() {
  const [activeFilter, setActiveFilter] = useState("All homes");
  const [saved, setSaved] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProperties(data.map(mapProperty));
        setIsLoading(false);
      });
  }, []);

  const visibleProperties = useMemo(
    () =>
      activeFilter === "All homes"
        ? properties
        : properties.filter((property) => property.type === activeFilter),
    [activeFilter, properties],
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <BrandLink />
        <div className="sidebar-user">
          <div className="avatar">GS</div>
          <div>
            <strong>House hunter view</strong>
            <span>Explore with clarity</span>
          </div>
        </div>
        <nav className="main-nav" aria-label="House hunter navigation">
          <a className="nav-item active" href="/listings">
            <span>⌂</span> Discover
          </a>
          <Link className="nav-item" href="/dashboard/favorites">
            <span>♡</span> Favorites <b>{saved.length || ""}</b>
          </Link>
          <Link className="nav-item" href="/dashboard/messages">
            <span>◷</span> Messages
          </Link>
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">Before you commit</span>
          <strong>See the whole story behind every home.</strong>
          <a href="/tools/budget" className="text-button">
            Check your budget <span>↗</span>
          </a>
        </div>
        <div className="sidebar-footer">
          <span className="status-dot" /> Intelligence is live
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Discover</span>
            <i>/</i> Property listings
          </div>
          <div className="top-actions">
            <a href="/auth" className="text-button">
              Sign in <span>↗</span>
            </a>
          </div>
        </header>
        <div className="content">
          <div className="hero-row">
            <div>
              <span className="eyebrow">Property listings</span>
              <h1>
                Find a home
                <br />
                <em>with the full story.</em>
              </h1>
              <p className="hero-copy">
                Compare more than rent. See the costs, utilities and details
                that matter before you commit.
              </p>
            </div>
            <div className="brief-card">
              <span className="eyebrow">KejaTrue promise</span>
              <strong>Clearer decisions start with better information.</strong>
              <small>Verified details appear as they are collected.</small>
            </div>
          </div>
          <div className="search-bar">
            <span className="search-icon">⌕</span>
            <input
              aria-label="Search by location or property"
              placeholder="Search by location, neighbourhood or property name"
            />
            <button type="button" className="filter-button">
              Filters <span>＋</span>
            </button>
          </div>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Latest homes</span>
              <h2>Homes worth a closer look</h2>
            </div>
            <a href="/auth" className="view-all">
              Create account <span>↗</span>
            </a>
          </div>
          <div
            className="filter-tabs"
            role="tablist"
            aria-label="Property type filters"
          >
            {["All homes", "Apartment", "Townhouse", "Studio"].map((filter) => (
              <button
                key={filter}
                type="button"
                className={
                  activeFilter === filter ? "filter-tab active" : "filter-tab"
                }
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          {isLoading ? (
            <div className="listing-state">
              <span className="state-mark">⌁</span>
              <h3>Reading the latest listings</h3>
              <p>KejaTrue is checking verified property data for you.</p>
            </div>
          ) : visibleProperties.length === 0 ? (
            <div className="listing-state">
              <span className="state-mark">＋</span>
              <h3>No published homes yet.</h3>
              <p>
                Once a landlord or agent adds a listing, its real costs and
                intelligence will appear here.
              </p>
            </div>
          ) : (
            <div className="property-grid">
              {visibleProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isSaved={saved.includes(property.id)}
                  onToggleSaved={(propertyId) =>
                    setSaved((current) =>
                      current.includes(propertyId)
                        ? current.filter((item) => item !== propertyId)
                        : [...current, propertyId],
                    )
                  }
                />
              ))}
            </div>
          )}
          <div className="intelligence-banner">
            <div className="banner-mark">✦</div>
            <div>
              <span className="eyebrow">A better way to decide</span>
              <h2>Know the home beyond the listing.</h2>
              <p>
                KejaTrue brings together cost, utilities, verification and lived
                experience.
              </p>
            </div>
            <a href="/about" className="dark-button">
              How it works <span>↗</span>
            </a>
          </div>
        </div>
        <SiteFooter />
      </section>
    </main>
  );
}
