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

export default function PropertyDiscovery() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All homes");
  const [saved, setSaved] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteUserIds, setFavoriteUserIds] = useState<string[]>([]);
  const [savingPropertyIds, setSavingPropertyIds] = useState<string[]>([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadPublicProperties() {
      try {
        const { error: staleListingsError } = await supabase.rpc(
          "mark_stale_listings",
        );

        if (staleListingsError) {
          throw staleListingsError;
        }

        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("listing_status", "active")
          .eq("moderation_status", "clear")
          .or("verification_status.is.null,verification_status.neq.rejected")
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (error) {
          throw error;
        }

        if (isMounted) {
          setProperties((data ?? []).map(mapProperty));
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load public listings.", error);
        setProperties([]);
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!isMounted || !user) return;

        setIsAuthenticated(true);
        const favoriteIds = await getFavoriteUserIds(supabase, user.id);
        if (!isMounted) return;
        setFavoriteUserIds(favoriteIds);

        const { data: favorites, error: favoritesError } = await supabase
          .from("favorites")
          .select("property_id")
          .in("user_id", favoriteIds);

        if (favoritesError) {
          throw favoritesError;
        }

        if (isMounted) {
          setSaved([
            ...new Set((favorites ?? []).map((favorite) => favorite.property_id)),
          ]);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load saved properties.", error);
        setFavoriteError("Your saved homes could not be loaded.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPublicProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  async function toggleSaved(propertyId: string) {
    if (favoriteUserIds.length === 0) {
      router.push(
        `/auth?mode=sign-in&next=${encodeURIComponent("/listings")}`,
      );
      return;
    }

    if (savingPropertyIds.includes(propertyId)) return;

    setSavingPropertyIds((current) => [...current, propertyId]);
    setFavoriteError("");

    try {
      const supabase = createClient();
      const isSaved = saved.includes(propertyId);
      if (isSaved) {
        const { error } = await supabase
            .from("favorites")
            .delete()
            .in("user_id", favoriteUserIds)
            .eq("property_id", propertyId);

        if (error) {
          throw error;
        }
      } else {
        await insertFavorite(supabase, favoriteUserIds, propertyId);
      }

      setSaved((current) =>
        isSaved
          ? current.filter((id) => id !== propertyId)
          : [...current, propertyId],
      );
    } catch (error) {
      console.error("Failed to update saved property.", error);
      setFavoriteError("We couldn’t update that favorite. Please try again.");
    } finally {
      setSavingPropertyIds((current) =>
        current.filter((id) => id !== propertyId),
      );
    }

  }

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
          <Link className="nav-item" href="/dashboard/profile">
            <span>◉</span> Profile
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
            <Link href="/dashboard/properties" className="view-all">
              Manage listings <span>↗</span>
            </Link>
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
          {favoriteError && (
            <div className="professional-message" role="alert">
              {favoriteError}
            </div>
          )}
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
