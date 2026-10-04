"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "../../backend/supabase/client";
import { getFavoriteUserIds } from "../../lib/favorite-user";
import { mapProperty, type Property } from "../../lib/properties";
import { BrandLink, SiteFooter } from "../../components/site-chrome";
import PropertyCard from "../../components/property-card";
import DashboardAccountActions from "../../components/dashboard-account-actions";

export default function FavoritesPage() {
  const router = useRouter();
  const [favoriteUserIds, setFavoriteUserIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          router.replace(
            `/auth?mode=sign-in&next=${encodeURIComponent("/dashboard/favorites")}`,
          );
          return;
        }

        const favoriteIds = await getFavoriteUserIds(supabase, user.id);

        if (isMounted) {
          setFavoriteUserIds(favoriteIds);
        }

        const { data: savedProperties, error: favoritesError } = await supabase
          .from("favorites")
          .select("property_id")
          .eq("user_id", user.id);

        if (favoritesError) {
          throw favoritesError;
        }

        const propertyIds = [
          ...new Set(
            (savedProperties ?? []).map((favorite) => favorite.property_id),
          ),
        ];

        if (propertyIds.length === 0) {
          if (isMounted) {
            setFavorites([]);
          }
          return;
        }

        const { data: propertyRows, error: propertiesError } = await supabase
          .from("properties")
          .select("*")
          .in("id", propertyIds);

        if (propertiesError) {
          throw propertiesError;
        }

        if (isMounted) {
          const propertyById = new Map(
            (propertyRows ?? []).map((property) => [
              property.id,
              mapProperty(property),
            ]),
          );
          setFavorites(
            propertyIds
              .map((propertyId) => propertyById.get(propertyId))
              .filter(
                (property): property is Property => property !== undefined,
              ),
          );
        }
      } catch (error) {
        console.error("Failed to load saved properties.", error);
        if (isMounted) {
          setErrorMessage("We couldn’t load your favorites. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function removeFavorite(propertyId: string) {
    if (favoriteUserIds.length === 0) return;

    const { error } = await createClient()
      .from("favorites")
      .delete()
      .eq("user_id", favoriteUserIds[0])
      .eq("property_id", propertyId);

    if (error) {
      console.error("Failed to remove saved property.", error);
      setActionError("We couldn’t remove that favorite. Please try again.");
      return;
    }

    setActionError("");
    setFavorites((current) =>
      current.filter((property) => property.id !== propertyId),
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <BrandLink />
        <div className="sidebar-user">
          <div className="avatar">♡</div>
          <div>
            <strong>House hunter</strong>
            <span>Your saved homes</span>
          </div>
        </div>
        <nav className="main-nav" aria-label="House hunter navigation">
          <Link className="nav-item" href="/listings">
            <span>⌂</span> Discover
          </Link>
          <Link className="nav-item active" href="/dashboard/favorites">
            <span>♡</span> Favorites
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
          <Link href="/tools/budget" className="text-button">
            Check your budget <span>↗</span>
          </Link>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <Link href="/">Home</Link>
            <i>/</i> Favorites
          </div>
          <div className="top-actions">
            <Link href="/listings" className="text-button">
              Find a home <span>↗</span>
            </Link>
            <DashboardAccountActions />
          </div>
        </header>

        <div className="content">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Your shortlist</span>
              <h1>Favorite homes</h1>
              <p>Keep the properties you’re considering in one place.</p>
            </div>
            <Link href="/listings" className="dark-button">
              Explore homes <span>↗</span>
            </Link>
          </div>

          {actionError && (
            <div className="professional-message" role="alert">
              {actionError}
            </div>
          )}

          {errorMessage && (
            <div className="listing-state" role="alert">
              <span className="state-mark">!</span>
              <h3>Favorites unavailable</h3>
              <p>{errorMessage}</p>
            </div>
          )}

          {!errorMessage && isLoading && (
            <div className="listing-state" aria-live="polite">
              <span className="state-mark">⌁</span>
              <h3>Loading your favorites</h3>
              <p>Your saved homes will appear here.</p>
            </div>
          )}

          {!errorMessage && !isLoading && favorites.length === 0 && (
            <div className="listing-state">
              <span className="state-mark">♡</span>
              <h3>No favorite homes yet</h3>
              <p>
                Save homes you like while browsing, and they’ll be waiting here
                when you’re ready to compare.
              </p>
              <Link href="/listings" className="dark-button">
                Browse property listings <span>↗</span>
              </Link>
            </div>
          )}

          {!errorMessage && !isLoading && favorites.length > 0 && (
            <div className="property-grid">
              {favorites.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isSaved
                  onToggleSaved={removeFavorite}
                />
              ))}
            </div>
          )}
        </div>
        <SiteFooter />
      </section>
    </main>
  );
}
