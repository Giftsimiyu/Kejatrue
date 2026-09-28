"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../backend/supabase/client";
import { SiteFooter, SiteNavbar } from "../../../components/site-chrome";

type Property = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  property_type: string | null;
  listing_type: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  city: string | null;
  location: string | null;
  address: string | null;
  thumbnail: string | null;
  featured: boolean | null;
  verification_status: string | null;
  trust_score: number | null;
  safety_score: number | null;
  water_score: number | null;
  network_score: number | null;
  area_score: number | null;
  true_monthly_cost: number | null;
  amenities: string[] | null;
  tags: string[] | null;
};

type Cost = {
  service_charge: number;
  garbage_fee: number;
  average_water_cost: number;
  average_electricity_cost: number;
  average_internet_cost: number;
  other_monthly_cost: number;
  notes: string;
};

type Verification = {
  owner_identity_verified: boolean;
  agent_verified: boolean;
  location_verified: boolean;
  documents_verified: boolean;
  physical_inspection_verified: boolean;
  photos_verified: boolean;
  verification_notes: string;
};

type PropertyImage = {
  id: string;
  image_url: string;
  caption: string | null;
  is_primary: boolean;
  display_order: number;
};

const emptyCost: Cost = {
  service_charge: 0,
  garbage_fee: 0,
  average_water_cost: 0,
  average_electricity_cost: 0,
  average_internet_cost: 0,
  other_monthly_cost: 0,
  notes: "",
};

const emptyVerification: Verification = {
  owner_identity_verified: false,
  agent_verified: false,
  location_verified: false,
  documents_verified: false,
  physical_inspection_verified: false,
  photos_verified: false,
  verification_notes: "",
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not set";
  }

  return `KSh ${new Intl.NumberFormat("en-KE").format(Number(value))}`;
}

function score(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Math.round(Number(value)).toString();
}

function scoreClass(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "management-score management-score--empty";
  }

  if (value >= 80) {
    return "management-score management-score--high";
  }

  if (value >= 60) {
    return "management-score management-score--medium";
  }

  return "management-score management-score--low";
}

export default function PropertyManagementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const propertyId = params.id;

  const supabase = useMemo(() => createClient(), []);

  const [property, setProperty] = useState<Property | null>(null);
  const [cost, setCost] = useState<Cost>(emptyCost);
  const [verification, setVerification] =
    useState<Verification>(emptyVerification);

  const [images, setImages] = useState<PropertyImage[]>([]);
  const [role, setRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "",
    listing_type: "rent",
    price: "",
    bedrooms: "",
    bathrooms: "",
    area_sqft: "",
    city: "",
    location: "",
    address: "",
    featured: false,
    amenities: "",
    tags: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadProperty() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth?mode=sign-in");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        (profile.role !== "agent" && profile.role !== "landlord")
      ) {
        router.replace("/");
        return;
      }

      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (propertyError || !propertyData) {
        if (mounted) {
          setErrorMessage("We could not find this property in your portfolio.");
          setLoading(false);
        }

        return;
      }

      const [costResult, verificationResult, imagesResult] = await Promise.all([
        supabase
          .from("property_costs")
          .select("*")
          .eq("property_id", propertyId)
          .maybeSingle(),

        supabase
          .from("property_verifications")
          .select("*")
          .eq("property_id", propertyId)
          .maybeSingle(),

        supabase
          .from("property_images")
          .select("id,image_url,caption,is_primary,display_order")
          .eq("property_id", propertyId)
          .order("display_order", {
            ascending: true,
          }),
      ]);

      if (!mounted) return;

      setRole(profile.role);

      setProperty(propertyData as Property);

      setForm({
        title: propertyData.title ?? "",
        description: propertyData.description ?? "",
        property_type: propertyData.property_type ?? "",
        listing_type: propertyData.listing_type ?? "rent",
        price: propertyData.price?.toString() ?? "",
        bedrooms: propertyData.bedrooms?.toString() ?? "",
        bathrooms: propertyData.bathrooms?.toString() ?? "",
        area_sqft: propertyData.area_sqft?.toString() ?? "",
        city: propertyData.city ?? "",
        location: propertyData.location ?? "",
        address: propertyData.address ?? "",
        featured: Boolean(propertyData.featured),
        amenities: Array.isArray(propertyData.amenities)
          ? propertyData.amenities.join(", ")
          : "",
        tags: Array.isArray(propertyData.tags)
          ? propertyData.tags.join(", ")
          : "",
      });

      if (costResult.data) {
        setCost({
          service_charge: Number(costResult.data.service_charge ?? 0),
          garbage_fee: Number(costResult.data.garbage_fee ?? 0),
          average_water_cost: Number(costResult.data.average_water_cost ?? 0),
          average_electricity_cost: Number(
            costResult.data.average_electricity_cost ?? 0,
          ),
          average_internet_cost: Number(
            costResult.data.average_internet_cost ?? 0,
          ),
          other_monthly_cost: Number(costResult.data.other_monthly_cost ?? 0),
          notes: costResult.data.notes ?? "",
        });
      }

      if (verificationResult.data) {
        setVerification({
          owner_identity_verified: Boolean(
            verificationResult.data.owner_identity_verified,
          ),
          agent_verified: Boolean(verificationResult.data.agent_verified),
          location_verified: Boolean(verificationResult.data.location_verified),
          documents_verified: Boolean(
            verificationResult.data.documents_verified,
          ),
          physical_inspection_verified: Boolean(
            verificationResult.data.physical_inspection_verified,
          ),
          photos_verified: Boolean(verificationResult.data.photos_verified),
          verification_notes: verificationResult.data.verification_notes ?? "",
        });
      }

      setImages((imagesResult.data ?? []) as PropertyImage[]);

      setLoading(false);
    }

    loadProperty();

    return () => {
      mounted = false;
    };
  }, [propertyId, router, supabase]);

  function updateForm<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveProperty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!property) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const slugBase = form.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const payload = {
      title: form.title.trim(),

      slug: slugBase ? `${slugBase}-${property.id.slice(0, 8)}` : property.id,

      description: form.description.trim() || null,

      property_type: form.property_type || null,

      listing_type: form.listing_type || "rent",

      price: form.price !== "" ? Number(form.price) : null,

      bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : null,

      bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : null,

      area_sqft: form.area_sqft !== "" ? Number(form.area_sqft) : null,

      city: form.city.trim() || null,

      location: form.location.trim() || null,

      address: form.address.trim() || null,

      featured: form.featured,

      amenities: form.amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),

      tags: form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    const { data, error } = await supabase
      .from("properties")
      .update(payload)
      .eq("id", property.id)
      .select("*")
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else {
      setProperty(data as Property);
      setMessage("Property details saved.");
    }

    setSaving(false);
  }

  async function saveCosts(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!property) return;

    setSavingCosts(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("property_costs").upsert(
      {
        property_id: property.id,
        service_charge: Number(cost.service_charge) || 0,
        garbage_fee: Number(cost.garbage_fee) || 0,
        average_water_cost: Number(cost.average_water_cost) || 0,
        average_electricity_cost: Number(cost.average_electricity_cost) || 0,
        average_internet_cost: Number(cost.average_internet_cost) || 0,
        other_monthly_cost: Number(cost.other_monthly_cost) || 0,
        notes: cost.notes.trim() || null,
      },
      {
        onConflict: "property_id",
      },
    );

    if (error) {
      setErrorMessage(error.message);
    } else {
      const { data: refreshed } = await supabase
        .from("properties")
        .select("*")
        .eq("id", property.id)
        .single();

      if (refreshed) {
        setProperty(refreshed as Property);
      }

      setMessage(
        "Monthly cost information saved. True Monthly Cost has been recalculated.",
      );
    }

    setSavingCosts(false);
  }

  async function saveVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!property) return;

    setSavingVerification(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("property_verifications").upsert(
      {
        property_id: property.id,

        owner_identity_verified: verification.owner_identity_verified,

        agent_verified: verification.agent_verified,

        location_verified: verification.location_verified,

        documents_verified: verification.documents_verified,

        physical_inspection_verified: verification.physical_inspection_verified,

        photos_verified: verification.photos_verified,

        verification_notes: verification.verification_notes.trim() || null,

        verified_at: null,
      },
      {
        onConflict: "property_id",
      },
    );

    if (error) {
      setErrorMessage(error.message);
    } else {
      const { data: refreshed } = await supabase
        .from("properties")
        .select("*")
        .eq("id", property.id)
        .single();

      if (refreshed) {
        setProperty(refreshed as Property);
      }

      setMessage(
        "Verification information saved. Trust Score has been recalculated.",
      );
    }

    setSavingVerification(false);
  }

  async function uploadImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length || !property) return;

    setUploading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const nextDisplayOrder = images.length;

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        if (!file.type.startsWith("image/")) {
          throw new Error(`"${file.name}" is not an image.`);
        }

        if (file.size > 8 * 1024 * 1024) {
          throw new Error(`"${file.name}" is larger than 8 MB.`);
        }

        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");

        const path = `${property.id}/${Date.now()}-${index}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("property-images").getPublicUrl(path);

        const { data: imageRow, error: imageError } = await supabase
          .from("property_images")
          .insert({
            property_id: property.id,
            image_url: publicUrl,
            caption: null,
            is_primary: images.length === 0 && index === 0,
            display_order: nextDisplayOrder + index,
          })
          .select("id,image_url,caption,is_primary,display_order")
          .single();

        if (imageError) {
          throw imageError;
        }

        setImages((current) => [...current, imageRow as PropertyImage]);
      }

      setMessage(
        `${files.length} image${files.length === 1 ? "" : "s"} uploaded.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function setPrimaryImage(image: PropertyImage) {
    if (!property) return;

    setMessage("");
    setErrorMessage("");

    const { error: resetError } = await supabase
      .from("property_images")
      .update({
        is_primary: false,
      })
      .eq("property_id", property.id);

    if (resetError) {
      setErrorMessage(resetError.message);
      return;
    }

    const { error } = await supabase
      .from("property_images")
      .update({
        is_primary: true,
      })
      .eq("id", image.id)
      .eq("property_id", property.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setImages((current) =>
      current.map((item) => ({
        ...item,
        is_primary: item.id === image.id,
      })),
    );

    setMessage("Primary property image updated.");
  }

  async function deleteImage(image: PropertyImage) {
    if (!property) return;

    if (!window.confirm("Delete this property image?")) {
      return;
    }

    const { error } = await supabase
      .from("property_images")
      .delete()
      .eq("id", image.id)
      .eq("property_id", property.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setImages((current) => current.filter((item) => item.id !== image.id));

    setMessage("Image removed from the listing.");
  }

  const verificationCount = useMemo(() => {
    return [
      verification.owner_identity_verified,
      verification.agent_verified,
      verification.location_verified,
      verification.documents_verified,
      verification.physical_inspection_verified,
      verification.photos_verified,
    ].filter(Boolean).length;
  }, [verification]);

  const calculatedVisibleCost = useMemo(() => {
    return (
      Number(form.price || 0) +
      Number(cost.service_charge || 0) +
      Number(cost.garbage_fee || 0) +
      Number(cost.average_water_cost || 0) +
      Number(cost.average_electricity_cost || 0) +
      Number(cost.average_internet_cost || 0) +
      Number(cost.other_monthly_cost || 0)
    );
  }, [cost, form.price]);

  if (loading) {
    return (
      <div className="site-shell dashboard-management-page">
        <SiteNavbar />

        <main className="dashboard-management-main">
          <div className="management-loading">Loading property workspace…</div>
        </main>

        <SiteFooter />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="site-shell dashboard-management-page">
        <SiteNavbar />

        <main className="dashboard-management-main">
          <div className="management-error-panel">
            <span className="eyebrow">Property workspace</span>

            <h1>Property unavailable</h1>

            <p>{errorMessage || "This property could not be loaded."}</p>

            <Link className="primary-button" href="/dashboard/properties">
              Back to properties
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="site-shell dashboard-management-page">
      <SiteNavbar />

      <main className="dashboard-management-main">
        <div className="management-breadcrumb">
          <Link href="/dashboard">Dashboard</Link>

          <span>/</span>

          <Link href="/dashboard/properties">Properties</Link>

          <span>/</span>

          <span>{property.title}</span>
        </div>

        <section className="management-header">
          <div>
            <span className="eyebrow">Property workspace</span>

            <h1>{property.title}</h1>

            <p>
              Keep the listing accurate, transparent and ready for KejaTrue
              intelligence.
            </p>
          </div>

          <div className="management-header-actions">
            {property.slug && (
              <Link
                className="secondary-button"
                href={`/property/${property.slug}`}
              >
                View public listing
              </Link>
            )}

            <Link className="secondary-button" href="/dashboard/properties">
              Back to properties
            </Link>
          </div>
        </section>

        {(message || errorMessage) && (
          <div
            className={
              errorMessage
                ? "management-alert management-alert--error"
                : "management-alert"
            }
          >
            {errorMessage || message}
          </div>
        )}

        <section className="management-intelligence">
          <div className="management-intelligence-heading">
            <div>
              <span className="eyebrow">KejaTrue intelligence</span>

              <h2>What your current data says</h2>
            </div>

            <span className="management-status">
              {property.verification_status?.replace("_", " ") || "pending"}
            </span>
          </div>

          <div className="management-score-grid">
            <div>
              <span>Trust</span>

              <strong className={scoreClass(property.trust_score)}>
                {score(property.trust_score)}
              </strong>
            </div>

            <div>
              <span>Safety</span>

              <strong className={scoreClass(property.safety_score)}>
                {score(property.safety_score)}
              </strong>
            </div>

            <div>
              <span>Water</span>

              <strong className={scoreClass(property.water_score)}>
                {score(property.water_score)}
              </strong>
            </div>

            <div>
              <span>Network</span>

              <strong className={scoreClass(property.network_score)}>
                {score(property.network_score)}
              </strong>
            </div>

            <div>
              <span>Area</span>

              <strong className={scoreClass(property.area_score)}>
                {score(property.area_score)}
              </strong>
            </div>

            <div>
              <span>True monthly cost</span>

              <strong>{money(property.true_monthly_cost)}</strong>
            </div>
          </div>
        </section>

        <div className="management-layout">
          <div className="management-primary-column">
            <form className="management-card" onSubmit={saveProperty}>
              <div className="management-card-heading">
                <div>
                  <span className="eyebrow">01 · Listing</span>

                  <h2>Property details</h2>
                </div>

                <span className="management-muted">
                  {role === "agent" ? "Agent listing" : "Landlord listing"}
                </span>
              </div>

              <div className="management-form-grid">
                <label className="management-field management-field--full">
                  <span>Property title</span>

                  <input
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="management-field management-field--full">
                  <span>Description</span>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    rows={5}
                    placeholder="Describe the property, nearby conveniences and anything a house hunter should know."
                  />
                </label>

                <label className="management-field">
                  <span>Property type</span>

                  <select
                    value={form.property_type}
                    onChange={(event) =>
                      updateForm("property_type", event.target.value)
                    }
                  >
                    <option value="">Select type</option>

                    <option value="bedsitter">Bedsitter</option>

                    <option value="studio">Studio</option>

                    <option value="apartment">Apartment</option>

                    <option value="house">House</option>

                    <option value="maisonette">Maisonette</option>

                    <option value="bungalow">Bungalow</option>

                    <option value="townhouse">Townhouse</option>

                    <option value="villa">Villa</option>

                    <option value="commercial">Commercial</option>
                  </select>
                </label>

                <label className="management-field">
                  <span>Listing type</span>

                  <select
                    value={form.listing_type}
                    onChange={(event) =>
                      updateForm("listing_type", event.target.value)
                    }
                  >
                    <option value="rent">For rent</option>

                    <option value="sale">For sale</option>
                  </select>
                </label>

                <label className="management-field">
                  <span>Monthly rent / price (KSh)</span>

                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) =>
                      updateForm("price", event.target.value)
                    }
                  />
                </label>

                <label className="management-field">
                  <span>Bedrooms</span>

                  <input
                    type="number"
                    min="0"
                    value={form.bedrooms}
                    onChange={(event) =>
                      updateForm("bedrooms", event.target.value)
                    }
                  />
                </label>

                <label className="management-field">
                  <span>Bathrooms</span>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.bathrooms}
                    onChange={(event) =>
                      updateForm("bathrooms", event.target.value)
                    }
                  />
                </label>

                <label className="management-field">
                  <span>Area (sq ft)</span>

                  <input
                    type="number"
                    min="0"
                    value={form.area_sqft}
                    onChange={(event) =>
                      updateForm("area_sqft", event.target.value)
                    }
                  />
                </label>

                <label className="management-field">
                  <span>City</span>

                  <input
                    value={form.city}
                    onChange={(event) => updateForm("city", event.target.value)}
                    placeholder="e.g. Nairobi"
                  />
                </label>

                <label className="management-field">
                  <span>Area / neighbourhood</span>

                  <input
                    value={form.location}
                    onChange={(event) =>
                      updateForm("location", event.target.value)
                    }
                    placeholder="e.g. Kilimani"
                  />
                </label>

                <label className="management-field management-field--full">
                  <span>Address / landmark</span>

                  <input
                    value={form.address}
                    onChange={(event) =>
                      updateForm("address", event.target.value)
                    }
                    placeholder="Street, building or nearby landmark"
                  />
                </label>

                <label className="management-field management-field--full">
                  <span>Amenities</span>

                  <input
                    value={form.amenities}
                    onChange={(event) =>
                      updateForm("amenities", event.target.value)
                    }
                    placeholder="Parking, Balcony, Borehole, CCTV"
                  />

                  <small>Separate amenities with commas.</small>
                </label>

                <label className="management-field management-field--full">
                  <span>Search tags</span>

                  <input
                    value={form.tags}
                    onChange={(event) => updateForm("tags", event.target.value)}
                    placeholder="student, family, furnished, near CBD"
                  />
                </label>

                <label className="management-checkbox">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) =>
                      updateForm("featured", event.target.checked)
                    }
                  />

                  <span>
                    <strong>Feature this property</strong>

                    <small>
                      Use this only for listings you want highlighted.
                    </small>
                  </span>
                </label>
              </div>

              <div className="management-card-footer">
                <span>
                  Saving updates keeps your listing data as the source for
                  KejaTrue calculations.
                </span>

                <button className="primary-button" disabled={saving}>
                  {saving ? "Saving…" : "Save property"}
                </button>
              </div>
            </form>

            <form className="management-card" onSubmit={saveCosts}>
              <div className="management-card-heading">
                <div>
                  <span className="eyebrow">02 · Transparency</span>

                  <h2>True Monthly Cost</h2>
                </div>

                <strong className="management-total-cost">
                  {money(calculatedVisibleCost)}
                </strong>
              </div>

              <p className="management-card-intro">
                Add recurring costs so house hunters can see more than the
                advertised rent.
              </p>

              <div className="management-form-grid">
                <label className="management-field">
                  <span>Service charge</span>

                  <input
                    type="number"
                    min="0"
                    value={cost.service_charge}
                    onChange={(event) =>
                      setCost({
                        ...cost,
                        service_charge: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="management-field">
                  <span>Garbage fee</span>

                  <input
                    type="number"
                    min="0"
                    value={cost.garbage_fee}
                    onChange={(event) =>
                      setCost({
                        ...cost,
                        garbage_fee: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="management-field">
                  <span>Average water cost</span>

                  <input
                    type="number"
                    min="0"
                    value={cost.average_water_cost}
                    onChange={(event) =>
                      setCost({
                        ...cost,
                        average_water_cost: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="management-field">
                  <span>Average electricity cost</span>

                  <input
                    type="number"
                    min="0"
                    value={cost.average_electricity_cost}
                    onChange={(event) =>
                      setCost({
                        ...cost,
                        average_electricity_cost: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="management-field">
                  <span>Average internet cost</span>

                  <input
                    type="number"
                    min="0"
                    value={cost.average_internet_cost}
                    onChange={(event) =>
                      setCost({
                        ...cost,
                        average_internet_cost: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="management-field">
                  <span>Other monthly costs</span>

                  <input
                    type="number"
                    min="0"
                    value={cost.other_monthly_cost}
                    onChange={(event) =>
                      setCost({
                        ...cost,
                        other_monthly_cost: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="management-field management-field--full">
                  <span>Cost notes</span>

                  <textarea
                    value={cost.notes}
                    onChange={(event) =>
                      setCost({
                        ...cost,
                        notes: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Explain anything that varies or is paid separately."
                  />
                </label>
              </div>

              <div className="management-card-footer">
                <span>
                  Current database calculation:{" "}
                  {money(property.true_monthly_cost)}
                </span>

                <button className="primary-button" disabled={savingCosts}>
                  {savingCosts ? "Saving…" : "Save cost information"}
                </button>
              </div>
            </form>

            <form className="management-card" onSubmit={saveVerification}>
              <div className="management-card-heading">
                <div>
                  <span className="eyebrow">03 · Trust</span>

                  <h2>Verification evidence</h2>
                </div>

                <strong>{verificationCount}/6 recorded</strong>
              </div>

              <p className="management-card-intro">
                These fields feed the property&apos;s Trust Score. Only mark
                evidence that has actually been verified.
              </p>

              <div className="verification-checklist">
                {[
                  [
                    "owner_identity_verified",
                    "Owner identity verified",
                    "Identity information has been checked.",
                  ],
                  [
                    "agent_verified",
                    "Agent verified",
                    "The responsible agent has been verified.",
                  ],
                  [
                    "location_verified",
                    "Location verified",
                    "The property's stated location has been checked.",
                  ],
                  [
                    "documents_verified",
                    "Documents verified",
                    "Relevant property documents have been checked.",
                  ],
                  [
                    "physical_inspection_verified",
                    "Physical inspection verified",
                    "The property has been physically inspected.",
                  ],
                  [
                    "photos_verified",
                    "Photos verified",
                    "Listing photos have been checked against the property.",
                  ],
                ].map(([key, title, description]) => (
                  <label className="verification-row" key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(verification[key as keyof Verification])}
                      onChange={(event) =>
                        setVerification((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />

                    <span>
                      <strong>{title}</strong>

                      <small>{description}</small>
                    </span>
                  </label>
                ))}
              </div>

              <label className="management-field management-field--full">
                <span>Verification notes</span>

                <textarea
                  value={verification.verification_notes}
                  onChange={(event) =>
                    setVerification({
                      ...verification,
                      verification_notes: event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Record useful verification details or evidence notes."
                />
              </label>

              <div className="management-card-footer">
                <span>
                  Trust Score status:{" "}
                  {property.trust_score === null
                    ? "Waiting for verification data"
                    : `${score(property.trust_score)}/100`}
                </span>

                <button
                  className="primary-button"
                  disabled={savingVerification}
                >
                  {savingVerification ? "Saving…" : "Save verification"}
                </button>
              </div>
            </form>

            <section className="management-card">
              <div className="management-card-heading">
                <div>
                  <span className="eyebrow">04 · Media</span>

                  <h2>Property images</h2>
                </div>

                <label className="secondary-button management-upload-button">
                  {uploading ? "Uploading…" : "Upload images"}

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={uploadImages}
                    disabled={uploading}
                    hidden
                  />
                </label>
              </div>

              <p className="management-card-intro">
                Add clear images of the actual property. The first image becomes
                primary unless you choose another.
              </p>

              {images.length ? (
                <div className="management-image-grid">
                  {images.map((image) => (
                    <article className="management-image-card" key={image.id}>
                      <img
                        src={image.image_url}
                        alt={image.caption || property.title}
                      />

                      <div>
                        {image.is_primary && (
                          <span className="management-image-primary">
                            Primary
                          </span>
                        )}

                        <div className="management-image-actions">
                          {!image.is_primary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryImage(image)}
                            >
                              Make primary
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteImage(image)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="management-empty-media">
                  <strong>No property images yet.</strong>

                  <span>
                    Upload real property photos to improve the listing.
                  </span>
                </div>
              )}
            </section>
          </div>

          <aside className="management-sidebar">
            <div className="management-side-card">
              <span className="eyebrow">Listing health</span>

              <h3>Keep the data complete</h3>

              <ul className="management-health-list">
                <li className={form.title && form.price ? "is-complete" : ""}>
                  Basic listing details
                </li>

                <li className={form.city && form.location ? "is-complete" : ""}>
                  Location information
                </li>

                <li className={images.length ? "is-complete" : ""}>
                  Property photos
                </li>

                <li
                  className={
                    property.true_monthly_cost !== null ? "is-complete" : ""
                  }
                >
                  True Monthly Cost
                </li>

                <li className={verificationCount > 0 ? "is-complete" : ""}>
                  Verification evidence
                </li>

                <li
                  className={
                    property.safety_score !== null ? "is-complete" : ""
                  }
                >
                  Review-based safety data
                </li>
              </ul>
            </div>

            <div className="management-side-card management-side-card--dark">
              <span className="eyebrow">What happens next</span>

              <h3>KejaTrue turns evidence into useful information.</h3>

              <p>
                Cost records feed the True Monthly Cost. Verification evidence
                feeds Trust Score. Approved tenant reviews feed Safety Score.
                Area data contributes to the property&apos;s area intelligence.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
