"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../backend/supabase/client";
import {
  getFavoriteUserIds,
  insertFavorite,
} from "../../lib/favorite-user";
import { SiteFooter, SiteNavbar } from "../../components/site-chrome";
import VirtualTourViewer from "@/app/components/virtual-tour-viewer";
import AIVirtualStaging from "@/app/components/ai-virtual-staging";

type Property = {
  id: string;
  owner_id: string;
  agent_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  property_type: string | null;
  listing_type: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  country: string | null;
  city: string | null;
  location: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  year_built: number | null;
  amenities: string[] | null;
  tags: string[] | null;
  thumbnail: string | null;
  featured: boolean | null;
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
  area_score: number | null;
  true_monthly_cost: number | null;
};

type PropertyImage = {
  id: string;
  image_url: string;
  caption: string | null;
  is_primary: boolean | null;
  display_order: number | null;
};

type VirtualTour = {
  id: string;
  panorama_url: string;
  room_name: string | null;
};

type PropertyCost = {
  service_charge: number | null;
  garbage_fee: number | null;
  average_water_cost: number | null;
  average_electricity_cost: number | null;
  average_internet_cost: number | null;
  other_monthly_cost: number | null;
  notes: string | null;
};

type AreaIntelligence = {
  city: string;
  area_name: string;
  water_reliability: number | null;
  security_score: number | null;
  network_quality: number | null;
  road_access_score: number | null;
  street_lighting_score: number | null;
  flood_risk_score: number | null;
  noise_score: number | null;
  overall_score: number | null;
  description: string | null;
};

type Review = {
  id: string;
  overall_rating: number | null;
  water_rating: number | null;
  security_rating: number | null;
  network_rating: number | null;
  noise_rating: number | null;
  landlord_rating: number | null;
  review_text: string | null;
  is_verified_tenant: boolean | null;
  created_at: string;
};

type Agent = {
  id: string;
  company: string | null;
  bio: string | null;
  image: string | null;
  phone: string | null;
  rating: number | null;
  verified: boolean | null;
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not available";
  }

  return `KSh ${Number(value).toLocaleString("en-KE")}`;
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Math.round(Number(value))}/100`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function getScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return "Not assessed";
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "Needs attention";
}

function ScoreCard({
  label,
  score,
  description,
}: {
  label: string;
  score: number | null;
  description: string;
}) {
  return (
    <div className="property-intelligence-card">
      <div className="property-intelligence-card-top">
        <span>{label}</span>
        <strong>{formatScore(score)}</strong>
      </div>

      <div className="property-score-bar">
        <div
          style={{
            width: `${Math.max(0, Math.min(100, Number(score ?? 0)))}%`,
          }}
        />
      </div>

      <small>
        {getScoreLabel(score)} · {description}
      </small>
    </div>
  );
}

export default function PublicPropertyPage() {
  const params = useParams();
  const router = useRouter();

  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : String(params?.slug ?? "");

  const supabase = useMemo(() => createClient(), []);

  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [virtualTours, setVirtualTours] = useState<VirtualTour[]>([]);
  const [costs, setCosts] = useState<PropertyCost | null>(null);
  const [area, setArea] = useState<AreaIntelligence | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [favoriteUserIds, setFavoriteUserIds] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    async function loadProperty() {
      setLoading(true);
      setError("");

      const { data: bySlug, error: slugError } = await supabase
        .from("properties")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      let propertyData = bySlug as Property | null;

      /*
       * If the slug lookup fails and the route parameter looks like
       * a UUID, allow the property ID to work as a fallback.
       */
      if (!propertyData && slugError === null) {
        const { data: byId } = await supabase
          .from("properties")
          .select("*")
          .eq("id", slug)
          .maybeSingle();

        propertyData = byId as Property | null;
      }

      if (cancelled) return;

      if (!propertyData) {
        setError("This property could not be found.");
        setLoading(false);
        return;
      }

      setProperty(propertyData);

      const [
        imagesResult,
        costsResult,
        areaResult,
        reviewsResult,
        agentResult,
        virtualToursResult,
        authResult,
      ] = await Promise.all([
        supabase
          .from("property_images")
          .select("id,image_url,caption,is_primary,display_order")
          .eq("property_id", propertyData.id)
          .order("display_order", {
            ascending: true,
            nullsFirst: false,
          }),

        supabase
          .from("property_costs")
          .select(
            "service_charge,garbage_fee,average_water_cost,average_electricity_cost,average_internet_cost,other_monthly_cost,notes",
          )
          .eq("property_id", propertyData.id)
          .maybeSingle(),

        propertyData.city && propertyData.location
          ? supabase
              .from("area_intelligence")
              .select(
                "city,area_name,water_reliability,security_score,network_quality,road_access_score,street_lighting_score,flood_risk_score,noise_score,overall_score,description",
              )
              .eq("city", propertyData.city)
              .eq("area_name", propertyData.location)
              .maybeSingle()
          : Promise.resolve({ data: null }),

        supabase
          .from("property_reviews")
          .select(
            "id,overall_rating,water_rating,security_rating,network_rating,noise_rating,landlord_rating,review_text,is_verified_tenant,created_at",
          )
          .eq("property_id", propertyData.id)
          .eq("is_approved", true)
          .order("created_at", { ascending: false }),

        propertyData.agent_id
          ? supabase
              .from("agents")
              .select("id,company,bio,image,phone,rating,verified")
              .eq("id", propertyData.agent_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),

        supabase
          .from("virtual_tours")
          .select("id,panorama_url,room_name")
          .eq("property_id", propertyData.id)
          .order("created_at", { ascending: true }),

        supabase.auth.getUser(),
      ]);

      if (cancelled) return;

      const loadedImages = (imagesResult.data ?? []) as PropertyImage[];

      setImages(loadedImages);
      setVirtualTours((virtualToursResult.data ?? []) as VirtualTour[]);
      setCosts((costsResult.data ?? null) as PropertyCost | null);
      setArea((areaResult.data ?? null) as AreaIntelligence | null);
      setReviews((reviewsResult.data ?? []) as Review[]);
      setAgent((agentResult.data ?? null) as Agent | null);

      const user = authResult?.data?.user ?? null;

      if (user) {
        setCurrentUserId(user.id);

        try {
          const resolvedFavoriteUserIds = await getFavoriteUserIds(
            supabase,
            user.id,
          );
          const { data: favorite, error: favoriteError } = await supabase
            .from("favorites")
            .select("id")
            .in("user_id", resolvedFavoriteUserIds)
            .eq("property_id", propertyData.id)
            .maybeSingle();

          if (favoriteError) {
            throw favoriteError;
          }

          if (!cancelled) {
            setFavoriteUserIds(resolvedFavoriteUserIds);
            setIsSaved(Boolean(favorite));
          }
        } catch (error) {
          console.error("Failed to load saved property state.", error);
          if (!cancelled) {
            setFavoriteUserIds([]);
            setIsSaved(false);
          }
        }
      } else {
        setCurrentUserId(null);
        setFavoriteUserIds([]);
        setIsSaved(false);
      }

      const primaryImage =
        loadedImages.find((image) => image.is_primary)?.image_url ??
        loadedImages[0]?.image_url ??
        propertyData.thumbnail ??
        null;

      setSelectedImage(primaryImage);
      setLoading(false);
    }

    loadProperty();

    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

  async function toggleFavorite() {
    if (!property) return;

    if (!currentUserId) {
      router.push(
        `/auth?mode=sign-in&next=/property/${encodeURIComponent(
          property.slug ?? property.id,
        )}`,
      );
      return;
    }

    if (favoriteUserIds.length === 0) {
      setFavoriteError("Your account profile could not be verified. Please try again.");
      return;
    }

    setSaving(true);
    setFavoriteError("");

    try {
      if (isSaved) {
        const { error: deleteError } = await supabase
          .from("favorites")
          .delete()
          .in("user_id", favoriteUserIds)
          .eq("property_id", property.id);

        if (deleteError) throw deleteError;
        setIsSaved(false);
      } else {
        await insertFavorite(supabase, favoriteUserIds, property.id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Failed to update saved property.", error);
      setFavoriteError("We couldn’t update that favorite. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function addToCompare() {
    if (!property) return;

    try {
      const existingRaw = localStorage.getItem("kejarue_compare");

      const existing: string[] = existingRaw ? JSON.parse(existingRaw) : [];

      const propertyId = property.id;

      if (!existing.includes(propertyId)) {
        const updated = [...existing, propertyId].slice(-4);
        localStorage.setItem("kejarue_compare", JSON.stringify(updated));
      }

      router.push("/compare");
    } catch {
      router.push("/compare");
    }
  }

  function contactOwner() {
    if (!property) return;

    if (!currentUserId) {
      router.push(
        `/auth?mode=sign-in&next=/property/${encodeURIComponent(
          property.slug ?? property.id,
        )}`,
      );
      return;
    }

    const recipientId = property.owner_id || property.agent_id;

    if (!recipientId) {
      router.push(
        `/dashboard/messages?property=${encodeURIComponent(property.id)}`,
      );
      return;
    }

    const params = new URLSearchParams({
      property: property.id,
      to: recipientId,
    });

    router.push(`/dashboard/messages?${params.toString()}`);
  }

  if (loading) {
    return (
      <>
        <SiteNavbar />

        <main className="public-property-page">
          <div className="property-loading">
            <div className="property-loading-spinner" />
            <h2>Loading property...</h2>
            <p>We are gathering the listing and transparency information.</p>
          </div>
        </main>

        <SiteFooter />
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <SiteNavbar />

        <main className="public-property-page">
          <div className="property-not-found">
            <div className="property-not-found-icon">⌂</div>

            <h1>Property not found</h1>

            <p>
              {error ||
                "The property you are looking for is no longer available."}
            </p>

            <Link href="/listings" className="property-primary-button">
              Browse available properties
            </Link>
          </div>
        </main>

        <SiteFooter />
      </>
    );
  }

  const sortedImages = [...images].sort(
    (a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0),
  );

  const galleryImages =
    sortedImages.length > 0
      ? sortedImages
      : property.thumbnail
        ? [
            {
              id: "thumbnail",
              image_url: property.thumbnail,
              caption: null,
              is_primary: true,
              display_order: 0,
            },
          ]
        : [];

  const mainImage = selectedImage ?? galleryImages[0]?.image_url ?? null;

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  const totalMonthlyCost =
    property.true_monthly_cost ??
    Number(property.price ?? 0) +
      Number(costs?.service_charge ?? 0) +
      Number(costs?.garbage_fee ?? 0) +
      Number(costs?.average_water_cost ?? 0) +
      Number(costs?.average_electricity_cost ?? 0) +
      Number(costs?.average_internet_cost ?? 0) +
      Number(costs?.other_monthly_cost ?? 0);

  const areaWaterScore =
    property.water_score ?? area?.water_reliability ?? null;

  const areaNetworkScore =
    property.network_score ?? area?.network_quality ?? null;

  const averageReviewRating =
    reviews.length > 0
      ? reviews.reduce(
          (sum, review) => sum + Number(review.overall_rating ?? 0),
          0,
        ) / reviews.length
      : null;

  return (
    <>
      <SiteNavbar />

      <main className="public-property-page">
        <div className="public-property-container">
          <Link href="/listings" className="property-back-link">
            ← Back to listings
          </Link>

          <section className="property-public-header">
            <div>
              <div className="property-public-eyebrow">
                {property.property_type || "Property"}{" "}
                {property.listing_type ? `· ${property.listing_type}` : ""}
              </div>

              <h1>{property.title}</h1>

              <p className="property-public-location">
                {property.location || "Location not specified"}
                {property.city ? `, ${property.city}` : ""}
                {property.country ? `, ${property.country}` : ""}
              </p>
            </div>

            <div className="property-header-actions">
              <button
                type="button"
                className={`property-outline-button ${
                  isSaved ? "is-active" : ""
                }`}
                onClick={toggleFavorite}
                disabled={saving}
              >
                {isSaved ? "♥ Saved" : "♡ Save"}
              </button>

              <button
                type="button"
                className="property-outline-button"
                onClick={addToCompare}
              >
                ⇄ Compare
              </button>
            </div>
          </section>
          {favoriteError && (
            <p className="professional-message" role="alert">
              {favoriteError}
            </p>
          )}

          <section className="property-gallery-section">
            <div className="property-main-image">
              {mainImage ? (
                <img src={mainImage} alt={property.title} />
              ) : (
                <div className="property-image-placeholder">
                  <span>⌂</span>
                  <p>No property photos available</p>
                </div>
              )}

              {property.verification_status === "verified" && (
                <div className="property-verified-badge">
                  ✓ Verified listing
                </div>
              )}
            </div>

            <div className="property-gallery-thumbnails">
              {galleryImages.slice(0, 5).map((image) => (
                <button
                  type="button"
                  key={image.id}
                  className={`property-thumbnail ${
                    selectedImage === image.image_url ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedImage(image.image_url)}
                >
                  <img
                    src={image.image_url}
                    alt={image.caption || `${property.title} property photo`}
                  />
                </button>
              ))}

              {galleryImages.length === 0 && (
                <div className="property-thumbnail-empty">
                  Photos will appear here when the listing is updated.
                </div>
              )}
            </div>
          </section>
          {virtualTours.length > 0 && (
            <VirtualTourViewer tours={virtualTours} />
          )}

          {galleryImages.length > 0 && (
            <AIVirtualStaging
              propertyId={property.id}
              images={galleryImages.map((image) => image.image_url)}
            />
          )}

          <section className="property-main-layout">
            <div className="property-main-content">
              <div className="property-card property-summary-card">
                <div className="property-summary-price">
                  <span>Monthly rent</span>
                  <strong>{formatCurrency(property.price)}</strong>
                </div>

                <div className="property-summary-cost">
                  <span>True monthly cost</span>
                  <strong>{formatCurrency(totalMonthlyCost)}</strong>

                  <small>Rent + known recurring property costs</small>
                </div>

                <div className="property-facts">
                  <div>
                    <strong>{property.bedrooms ?? "—"}</strong>
                    <span>Bedrooms</span>
                  </div>

                  <div>
                    <strong>{property.bathrooms ?? "—"}</strong>
                    <span>Bathrooms</span>
                  </div>

                  <div>
                    <strong>
                      {property.area_sqft
                        ? property.area_sqft.toLocaleString()
                        : "—"}
                    </strong>
                    <span>Sq Ft</span>
                  </div>

                  <div>
                    <strong>{property.year_built ?? "—"}</strong>
                    <span>Year built</span>
                  </div>
                </div>
              </div>

              <div className="property-card">
                <div className="property-section-heading">
                  <div>
                    <span className="property-section-kicker">
                      About this property
                    </span>
                    <h2>Property overview</h2>
                  </div>
                </div>

                <p className="property-description">
                  {property.description ||
                    "The owner has not provided a detailed description for this property yet."}
                </p>

                {property.address && (
                  <div className="property-address">
                    <strong>Address</strong>
                    <span>{property.address}</span>
                  </div>
                )}
              </div>

              <div className="property-card">
                <div className="property-section-heading">
                  <div>
                    <span className="property-section-kicker">Costs</span>
                    <h2>What you may actually pay</h2>
                  </div>
                </div>

                <div className="property-cost-list">
                  <div>
                    <span>Monthly rent</span>
                    <strong>{formatCurrency(property.price)}</strong>
                  </div>

                  <div>
                    <span>Service charge</span>
                    <strong>{formatCurrency(costs?.service_charge)}</strong>
                  </div>

                  <div>
                    <span>Garbage fee</span>
                    <strong>{formatCurrency(costs?.garbage_fee)}</strong>
                  </div>

                  <div>
                    <span>Average water cost</span>
                    <strong>{formatCurrency(costs?.average_water_cost)}</strong>
                  </div>

                  <div>
                    <span>Average electricity cost</span>
                    <strong>
                      {formatCurrency(costs?.average_electricity_cost)}
                    </strong>
                  </div>

                  <div>
                    <span>Average internet cost</span>
                    <strong>
                      {formatCurrency(costs?.average_internet_cost)}
                    </strong>
                  </div>

                  <div>
                    <span>Other monthly costs</span>
                    <strong>{formatCurrency(costs?.other_monthly_cost)}</strong>
                  </div>

                  <div className="property-cost-total">
                    <span>Estimated true monthly cost</span>
                    <strong>{formatCurrency(totalMonthlyCost)}</strong>
                  </div>
                </div>

                {costs?.notes && (
                  <div className="property-cost-note">
                    <strong>Cost notes</strong>
                    <p>{costs.notes}</p>
                  </div>
                )}
              </div>

              {(property.amenities?.length || property.tags?.length) && (
                <div className="property-card">
                  <div className="property-section-heading">
                    <div>
                      <span className="property-section-kicker">Features</span>
                      <h2>Amenities & features</h2>
                    </div>
                  </div>

                  <div className="property-tags">
                    {property.amenities?.map((amenity) => (
                      <span key={`amenity-${amenity}`}>✓ {amenity}</span>
                    ))}

                    {property.tags?.map((tag) => (
                      <span key={`tag-${tag}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="property-card">
                <div className="property-section-heading">
                  <div>
                    <span className="property-section-kicker">
                      Area intelligence
                    </span>
                    <h2>What KejaTrue knows about the area</h2>
                  </div>
                </div>

                {area ? (
                  <>
                    <div className="area-intelligence-grid">
                      <ScoreCard
                        label="Water reliability"
                        score={areaWaterScore}
                        description="Based on available area/property data."
                      />

                      <ScoreCard
                        label="Security"
                        score={property.safety_score ?? area.security_score}
                        description="Security information from available evidence and reviews."
                      />

                      <ScoreCard
                        label="Network quality"
                        score={areaNetworkScore}
                        description="Available network-quality information."
                      />

                      <ScoreCard
                        label="Road access"
                        score={area.road_access_score}
                        description="Area road accessibility."
                      />

                      <ScoreCard
                        label="Street lighting"
                        score={area.street_lighting_score}
                        description="Available street-lighting information."
                      />

                      <ScoreCard
                        label="Flood risk"
                        score={area.flood_risk_score}
                        description="Higher score represents better conditions in the area dataset."
                      />
                    </div>

                    {area.description && (
                      <p className="area-intelligence-description">
                        {area.description}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="property-data-empty">
                    <strong>Area intelligence is not available yet.</strong>
                    <p>
                      KejaTrue has not yet collected enough area-level
                      information for this exact location.
                    </p>
                  </div>
                )}
              </div>

              <div className="property-card">
                <div className="property-section-heading">
                  <div>
                    <span className="property-section-kicker">
                      Renter experience
                    </span>
                    <h2>Reviews from people with experience</h2>
                  </div>

                  {averageReviewRating !== null && (
                    <div className="property-review-summary">
                      <strong>{averageReviewRating.toFixed(1)}</strong>
                      <span>
                        ★ · {reviews.length}{" "}
                        {reviews.length === 1 ? "review" : "reviews"}
                      </span>
                    </div>
                  )}
                </div>

                {displayedReviews.length > 0 ? (
                  <div className="property-review-list">
                    {displayedReviews.map((review) => (
                      <article className="property-review" key={review.id}>
                        <div className="property-review-header">
                          <div>
                            <strong>
                              {review.overall_rating
                                ? `${Number(review.overall_rating).toFixed(
                                    1,
                                  )}/5`
                                : "Rating unavailable"}
                            </strong>

                            {review.is_verified_tenant && (
                              <span className="verified-review-label">
                                ✓ Verified tenant
                              </span>
                            )}
                          </div>

                          <time>{formatDate(review.created_at)}</time>
                        </div>

                        {review.review_text && <p>{review.review_text}</p>}

                        <div className="review-detail-grid">
                          {review.water_rating !== null && (
                            <span>
                              Water{" "}
                              <strong>
                                {review.water_rating}
                                /5
                              </strong>
                            </span>
                          )}

                          {review.security_rating !== null && (
                            <span>
                              Security{" "}
                              <strong>
                                {review.security_rating}
                                /5
                              </strong>
                            </span>
                          )}

                          {review.network_rating !== null && (
                            <span>
                              Network{" "}
                              <strong>
                                {review.network_rating}
                                /5
                              </strong>
                            </span>
                          )}

                          {review.noise_rating !== null && (
                            <span>
                              Noise{" "}
                              <strong>
                                {review.noise_rating}
                                /5
                              </strong>
                            </span>
                          )}

                          {review.landlord_rating !== null && (
                            <span>
                              Landlord{" "}
                              <strong>
                                {review.landlord_rating}
                                /5
                              </strong>
                            </span>
                          )}
                        </div>
                      </article>
                    ))}

                    {reviews.length > 3 && (
                      <button
                        type="button"
                        className="property-text-button"
                        onClick={() => setShowAllReviews((current) => !current)}
                      >
                        {showAllReviews
                          ? "Show fewer reviews"
                          : `Show all ${reviews.length} reviews`}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="property-data-empty">
                    <strong>No approved reviews yet.</strong>
                    <p>
                      Reviews will appear here after they have been submitted
                      and approved.
                    </p>
                  </div>
                )}
              </div>

              <div className="property-card">
                <div className="property-section-heading">
                  <div>
                    <span className="property-section-kicker">Location</span>
                    <h2>Property location</h2>
                  </div>
                </div>

                {property.lat != null && property.lng != null ? (
                  <div className="property-map-placeholder">
                    <div>
                      <span>⌖</span>
                      <strong>
                        {property.location ||
                          property.city ||
                          "Property location"}
                      </strong>

                      <p>
                        Coordinates available: {Number(property.lat).toFixed(5)}
                        , {Number(property.lng).toFixed(5)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="property-map-placeholder">
                    <div>
                      <span>⌖</span>
                      <strong>
                        {property.location ||
                          property.city ||
                          "Location not specified"}
                      </strong>

                      <p>
                        Exact map coordinates have not been provided for this
                        listing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="property-sidebar">
              <div className="property-card property-trust-card">
                <div className="property-sidebar-kicker">
                  KejaTrue Intelligence
                </div>

                <h2>Trust Score</h2>

                <div className="property-trust-score">
                  <strong>{formatScore(property.trust_score)}</strong>

                  <span>{getScoreLabel(property.trust_score)}</span>
                </div>

                <p>
                  The score reflects the verification evidence currently
                  recorded for this property.
                </p>

                <div className="property-trust-status">
                  <span>Owner identity</span>
                  <strong>
                    {property.verification_status === "verified"
                      ? "Verified listing"
                      : property.verification_status === "partially_verified"
                        ? "Partially verified"
                        : "Pending verification"}
                  </strong>
                </div>

                <Link href="#intelligence" className="property-sidebar-link">
                  Understand this score →
                </Link>
              </div>

              <div className="property-card property-score-list-card">
                <h2>Property intelligence</h2>

                <ScoreCard
                  label="Safety"
                  score={property.safety_score}
                  description="Calculated from approved property reviews."
                />

                <ScoreCard
                  label="Water"
                  score={areaWaterScore}
                  description="Property or area water-reliability data."
                />

                <ScoreCard
                  label="Network"
                  score={areaNetworkScore}
                  description="Property or area network information."
                />

                <ScoreCard
                  label="Area"
                  score={property.area_score ?? area?.overall_score ?? null}
                  description="Overall area conditions."
                />
              </div>

              <div className="property-card property-contact-card">
                <h2>Interested in this property?</h2>

                <p>Contact the listing owner or agent through KejaTrue.</p>

                <button
                  type="button"
                  className="property-primary-button property-full-button"
                  onClick={contactOwner}
                >
                  Contact listing owner
                </button>

                <button
                  type="button"
                  className="property-secondary-button property-full-button"
                  onClick={addToCompare}
                >
                  Add to comparison
                </button>
              </div>

              {agent && (
                <div className="property-card property-agent-card">
                  <div className="property-sidebar-kicker">
                    Listing professional
                  </div>

                  <div className="property-agent-profile">
                    {agent.image ? (
                      <img
                        src={agent.image}
                        alt={agent.company || "Real estate agent"}
                      />
                    ) : (
                      <div className="property-agent-avatar">
                        {(agent.company || "A").charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <strong>{agent.company || "Real estate agent"}</strong>

                      {agent.verified && (
                        <span className="verified-review-label">
                          ✓ Verified professional
                        </span>
                      )}
                    </div>
                  </div>

                  {agent.bio && <p>{agent.bio}</p>}

                  {agent.rating !== null && (
                    <div className="agent-rating">
                      ★ {Number(agent.rating).toFixed(1)}
                    </div>
                  )}
                </div>
              )}
            </aside>
          </section>

          <section
            id="intelligence"
            className="property-card property-intelligence-explanation"
          >
            <div className="property-section-heading">
              <div>
                <span className="property-section-kicker">
                  Transparency by design
                </span>
                <h2>How KejaTrue helps you evaluate a home</h2>
              </div>
            </div>

            <div className="intelligence-explanation-grid">
              <div>
                <span>01</span>
                <h3>Trust Score</h3>
                <p>
                  Uses the verification evidence recorded for the listing rather
                  than simply trusting the advertisement.
                </p>
              </div>

              <div>
                <span>02</span>
                <h3>True Monthly Cost</h3>
                <p>
                  Brings recurring property costs together with rent so you can
                  see a more realistic monthly housing cost.
                </p>
              </div>

              <div>
                <span>03</span>
                <h3>Area Intelligence</h3>
                <p>
                  Makes available information about water, security, network
                  quality, roads, lighting, flooding and noise easier to
                  understand.
                </p>
              </div>

              <div>
                <span>04</span>
                <h3>Renter Experience</h3>
                <p>
                  Approved reviews provide additional evidence about conditions
                  experienced by previous renters.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
