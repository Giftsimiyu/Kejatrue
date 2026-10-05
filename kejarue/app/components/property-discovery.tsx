"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "../backend/supabase/client";
import { getFavoriteUserIds, insertFavorite } from "../lib/favorite-user";
import { mapProperty, type Property } from "../lib/properties";
import { BrandLink, SiteFooter } from "./site-chrome";
import PropertyCard from "./property-card";
import DashboardAccountActions from "./dashboard-account-actions";

type SearchFilters = {
  search: string;
  propertyType: string;
  minBedrooms: string;
  maxRent: string;
  minRent: string;
  availability: string;
  verifiedOnly: boolean;
  minTrust: string;
  minSafety: string;
};

const defaultFilters: SearchFilters = {
  search: "",
  propertyType: "all",
  minBedrooms: "any",
  maxRent: "",
  minRent: "",
  availability: "available",
  verifiedOnly: false,
  minTrust: "any",
  minSafety: "any",
};

const propertyTypes = [
  "all",
  "Apartment",
  "Studio",
  "Bedsitter",
  "Maisonette",
  "Townhouse",
  "Standalone House",
  "Bungalow",
  "Villa",
  "Gated Estate",
  "Student Residence",
];

function normalise(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export default function PropertyDiscovery() {
  const router = useRouter();

  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  const [showFilters, setShowFilters] = useState(false);

  const [saved, setSaved] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [favoriteUserIds, setFavoriteUserIds] = useState<string[]>([]);

  const [savingPropertyIds, setSavingPropertyIds] = useState<string[]>([]);

  const [favoriteError, setFavoriteError] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProperties() {
      const supabase = createClient();

      setIsLoading(true);

      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          *,
          property_units (
            id,
            unit_label,
            floor_label,
            status,
            rent_override,
            bedrooms,
            bathrooms,
            area_sqft
          )
        `,
        )
        .eq("listing_status", "active")
        .eq("moderation_status", "clear")
        .or("verification_status.is.null,verification_status.neq.rejected")
        .order("created_at", {
          ascending: false,
        });

      if (!mounted) return;

      if (error) {
        console.error("Failed to load properties:", error);

        setProperties([]);
      } else {
        setProperties((data ?? []).map(mapProperty));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (user) {
        setIsAuthenticated(true);

        try {
          const ids = await getFavoriteUserIds(supabase, user.id);

          if (!mounted) return;

          setFavoriteUserIds(ids);

          const { data: favorites } = await supabase
            .from("favorites")
            .select("property_id")
            .in("user_id", ids);

          if (!mounted) return;

          setSaved([
            ...new Set((favorites ?? []).map((item) => item.property_id)),
          ]);
        } catch (error) {
          console.error("Failed to load favorites:", error);

          setFavoriteError("Your saved homes could not be loaded.");
        }
      }

      setIsLoading(false);
    }

    loadProperties();

    return () => {
      mounted = false;
    };
  }, []);

  async function toggleSaved(propertyId: string) {
    if (favoriteUserIds.length === 0) {
      router.push(`/auth?mode=sign-in&next=${encodeURIComponent("/listings")}`);

      return;
    }

    if (savingPropertyIds.includes(propertyId)) {
      return;
    }

    setSavingPropertyIds((current) => [...current, propertyId]);

    try {
      const supabase = createClient();

      const isSaved = saved.includes(propertyId);

      if (isSaved) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .in("user_id", favoriteUserIds)
          .eq("property_id", propertyId);

        if (error) throw error;
      } else {
        await insertFavorite(supabase, favoriteUserIds, propertyId);
      }

      setSaved((current) =>
        isSaved
          ? current.filter((id) => id !== propertyId)
          : [...current, propertyId],
      );
    } catch (error) {
      console.error("Failed to update saved property:", error);

      setFavoriteError("We couldn't update that favorite. Please try again.");
    } finally {
      setSavingPropertyIds((current) =>
        current.filter((id) => id !== propertyId),
      );
    }
  }

  const visibleProperties = useMemo(() => {
    const searchTerm = normalise(filters.search);

    const minBedrooms =
      filters.minBedrooms === "any" ? null : Number(filters.minBedrooms);

    const maxRent =
      filters.maxRent.trim() === "" ? null : Number(filters.maxRent);

    const minRent =
      filters.minRent.trim() === "" ? null : Number(filters.minRent);

    const minTrust =
      filters.minTrust === "any" ? null : Number(filters.minTrust);

    const minSafety =
      filters.minSafety === "any" ? null : Number(filters.minSafety);

    return properties.filter((property) => {
      const searchableText = normalise(
        [
          property.title,
          property.location,
          property.type,
          property.description,
        ].join(" "),
      );

      if (searchTerm && !searchableText.includes(searchTerm)) {
        return false;
      }

      if (
        filters.propertyType !== "all" &&
        normalise(property.type) !== normalise(filters.propertyType)
      ) {
        return false;
      }

      if (minBedrooms !== null && property.bedrooms < minBedrooms) {
        return false;
      }

      if (minRent !== null && property.rent < minRent) {
        return false;
      }

      if (maxRent !== null && property.rent > maxRent) {
        return false;
      }

      if (filters.verifiedOnly && !property.verified) {
        return false;
      }

      const trustScore = Number((property as any).trust_score ?? 0);

      if (minTrust !== null && trustScore < minTrust) {
        return false;
      }

      const safetyScore = Number((property as any).safety_score ?? 0);

      if (minSafety !== null && safetyScore < minSafety) {
        return false;
      }

      return true;
    });
  }, [filters, properties]);

  function updateFilter<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  const activeFilterCount = [
    filters.propertyType !== "all",
    filters.minBedrooms !== "any",
    filters.maxRent !== "",
    filters.minRent !== "",
    filters.verifiedOnly,
    filters.minTrust !== "any",
    filters.minSafety !== "any",
  ].filter(Boolean).length;

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
            <span>⌂</span>
            Discover
          </a>

          <Link className="nav-item" href="/dashboard/favorites">
            <span>♡</span>
            Favorites <b>{saved.length || ""}</b>
          </Link>

          <Link className="nav-item" href="/dashboard/messages">
            <span>◷</span>
            Messages
          </Link>

          <Link className="nav-item" href="/dashboard/profile">
            <span>◉</span>
            Profile
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
          <span className="status-dot" />
          Intelligence is live
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Discover</span>
            <i>/</i>
            Property listings
          </div>

          <div className="top-actions">
            <DashboardAccountActions isAuthenticated={isAuthenticated} />
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
                Search by location, property type, budget, bedrooms and KejaTrue
                intelligence.
              </p>
            </div>

            <div className="brief-card">
              <span className="eyebrow">KejaTrue promise</span>

              <strong>Clearer decisions start with better information.</strong>

              <small>Verified details appear as they are collected.</small>
            </div>
          </div>

          <section className="search-bar">
            <span className="search-icon">⌕</span>

            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              aria-label="Search properties"
              placeholder="Search by location, neighbourhood or property name"
            />

            <button
              type="button"
              className="filter-button"
              onClick={() => setShowFilters((current) => !current)}
            >
              Filters
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              <span>{showFilters ? "−" : "＋"}</span>
            </button>
          </section>

          {showFilters && (
            <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Property type</span>

                  <select
                    value={filters.propertyType}
                    onChange={(event) =>
                      updateFilter("propertyType", event.target.value)
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-3"
                  >
                    {propertyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type === "all" ? "All property types" : type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Minimum bedrooms</span>

                  <select
                    value={filters.minBedrooms}
                    onChange={(event) =>
                      updateFilter("minBedrooms", event.target.value)
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-3"
                  >
                    <option value="any">Any</option>

                    <option value="1">1+</option>

                    <option value="2">2+</option>

                    <option value="3">3+</option>

                    <option value="4">4+</option>

                    <option value="5">5+</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Minimum rent</span>

                  <input
                    type="number"
                    value={filters.minRent}
                    onChange={(event) =>
                      updateFilter("minRent", event.target.value)
                    }
                    placeholder="e.g. 15000"
                    className="w-full rounded-xl border border-black/10 px-4 py-3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Maximum rent</span>

                  <input
                    type="number"
                    value={filters.maxRent}
                    onChange={(event) =>
                      updateFilter("maxRent", event.target.value)
                    }
                    placeholder="e.g. 50000"
                    className="w-full rounded-xl border border-black/10 px-4 py-3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Availability</span>

                  <select
                    value={filters.availability}
                    onChange={(event) =>
                      updateFilter("availability", event.target.value)
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-3"
                  >
                    <option value="available">Available now</option>

                    <option value="all">All listings</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Minimum trust</span>

                  <select
                    value={filters.minTrust}
                    onChange={(event) =>
                      updateFilter("minTrust", event.target.value)
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-3"
                  >
                    <option value="any">Any</option>

                    <option value="60">60+</option>

                    <option value="70">70+</option>

                    <option value="80">80+</option>

                    <option value="90">90+</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Minimum safety</span>

                  <select
                    value={filters.minSafety}
                    onChange={(event) =>
                      updateFilter("minSafety", event.target.value)
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-3"
                  >
                    <option value="any">Any</option>

                    <option value="60">60+</option>

                    <option value="70">70+</option>

                    <option value="80">80+</option>

                    <option value="90">90+</option>
                  </select>
                </label>

                <label className="flex items-center gap-3 self-end rounded-xl border border-black/10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(event) =>
                      updateFilter("verifiedOnly", event.target.checked)
                    }
                  />

                  <span className="text-sm font-medium">
                    Verified listings only
                  </span>
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold"
                >
                  Clear filters
                </button>
              </div>
            </section>
          )}

          <div className="section-heading">
            <div>
              <span className="eyebrow">Search results</span>

              <h2>
                {isLoading
                  ? "Finding homes..."
                  : `${visibleProperties.length} ${
                      visibleProperties.length === 1 ? "home" : "homes"
                    } found`}
              </h2>
            </div>
          </div>

          <div
            className="filter-tabs"
            role="tablist"
            aria-label="Property type filters"
          >
            {propertyTypes.slice(0, 4).map((type) => {
              const label = type === "all" ? "All homes" : type;

              return (
                <button
                  key={type}
                  type="button"
                  className={
                    filters.propertyType === type
                      ? "filter-tab active"
                      : "filter-tab"
                  }
                  onClick={() => updateFilter("propertyType", type)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {favoriteError && (
            <div className="professional-message" role="alert">
              {favoriteError}
            </div>
          )}

          {isLoading ? (
            <div className="listing-state">
              <span className="state-mark">⌁</span>

              <h3>Reading the latest listings</h3>

              <p>KejaTrue is checking property data for you.</p>
            </div>
          ) : visibleProperties.length === 0 ? (
            <div className="listing-state">
              <span className="state-mark">⌕</span>

              <h3>No homes match those filters.</h3>

              <p>
                Try widening your budget, changing the property type, or
                removing one of the intelligence filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="dark-button"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="property-grid">
              {visibleProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isSaved={saved.includes(property.id)}
                  isSaving={savingPropertyIds.includes(property.id)}
                  onToggleSaved={toggleSaved}
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
