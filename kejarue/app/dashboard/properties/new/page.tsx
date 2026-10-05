"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HiCheck } from "react-icons/hi2";

import { createClient } from "../../../backend/supabase/client";
import { SiteFooter, SiteNavbar } from "../../../components/site-chrome";
import DashboardAccountActions from "../../../components/dashboard-account-actions";

type PropertyType =
  | "Apartment"
  | "Studio"
  | "Bedsitter"
  | "Maisonette"
  | "Townhouse"
  | "Standalone House"
  | "Bungalow"
  | "Villa"
  | "Gated Estate"
  | "Student Residence"
  | "Commercial"
  | "Office"
  | "Shop"
  | "Land"
  | "Other";

type PropertyForm = {
  propertyType: PropertyType | "";
  title: string;
  description: string;

  city: string;
  location: string;
  address: string;

  price: string;
  bedrooms: string;
  bathrooms: string;
  areaSqft: string;

  listingType: "rent" | "sale";

  amenities: string;
  tags: string;

  yearBuilt: string;

  furnished: boolean;
  parking: boolean;

  waterAvailable: boolean;
  electricityAvailable: boolean;

  featured: boolean;
};

const PROPERTY_TYPES: {
  value: PropertyType;
  description: string;
}[] = [
  {
    value: "Apartment",
    description: "Multi-unit residential building",
  },
  {
    value: "Studio",
    description: "Single-room self-contained unit",
  },
  {
    value: "Bedsitter",
    description: "Compact single-room residence",
  },
  {
    value: "Maisonette",
    description: "Multi-level family home",
  },
  {
    value: "Townhouse",
    description: "Attached or semi-attached residential home",
  },
  {
    value: "Standalone House",
    description: "Independent residential house",
  },
  {
    value: "Bungalow",
    description: "Single-storey residential house",
  },
  {
    value: "Villa",
    description: "Premium standalone residence",
  },
  {
    value: "Gated Estate",
    description: "Multiple homes within a managed estate",
  },
  {
    value: "Student Residence",
    description: "Accommodation designed for students",
  },
  {
    value: "Commercial",
    description: "Commercial property",
  },
  {
    value: "Office",
    description: "Office space",
  },
  {
    value: "Shop",
    description: "Retail or shop space",
  },
  {
    value: "Land",
    description: "Land or development plot",
  },
  {
    value: "Other",
    description: "Another property category",
  },
];

const MULTI_UNIT_TYPES: PropertyType[] = [
  "Apartment",
  "Gated Estate",
  "Townhouse",
  "Student Residence",
];

const RESIDENTIAL_TYPES: PropertyType[] = [
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

const DEFAULT_FORM: PropertyForm = {
  propertyType: "",

  title: "",
  description: "",

  city: "",
  location: "",
  address: "",

  price: "",
  bedrooms: "",
  bathrooms: "",
  areaSqft: "",

  listingType: "rent",

  amenities: "",
  tags: "",

  yearBuilt: "",

  furnished: false,
  parking: false,

  waterAvailable: true,
  electricityAvailable: true,

  featured: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function numberOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function textArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLand(type: PropertyType | "") {
  return type === "Land";
}

function isCommercial(type: PropertyType | "") {
  return type === "Commercial" || type === "Office" || type === "Shop";
}

function isResidential(type: PropertyType | "") {
  return RESIDENTIAL_TYPES.includes(type as PropertyType);
}

function supportsUnits(type: PropertyType | "") {
  return MULTI_UNIT_TYPES.includes(type as PropertyType);
}

export default function NewPropertyPage() {
  const supabase = useMemo(() => createClient(), []);

  const [form, setForm] = useState<PropertyForm>(DEFAULT_FORM);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [createdPropertyId, setCreatedPropertyId] = useState("");

  const [createdPropertySlug, setCreatedPropertySlug] = useState("");

  function updateForm<K extends keyof PropertyForm>(
    field: K,
    value: PropertyForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const selectedType = form.propertyType;

  const hasUnits = supportsUnits(selectedType);

  const landListing = isLand(selectedType);

  const commercialListing = isCommercial(selectedType);

  const residentialListing = isResidential(selectedType);

  async function createProperty() {
    setError("");
    setSuccess("");

    if (!form.propertyType) {
      setError("Choose the type of property you are listing.");
      return;
    }

    if (!form.title.trim()) {
      setError("Enter a property or development name.");
      return;
    }

    if (!form.city.trim()) {
      setError("Enter the city.");
      return;
    }

    if (!form.location.trim()) {
      setError("Enter the area or neighbourhood.");
      return;
    }

    if (!form.price.trim()) {
      setError("Enter the asking monthly rent.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error("Your KejaTrue profile could not be found.");
      }

      if (profile.role !== "agent" && profile.role !== "landlord") {
        throw new Error(
          "Only landlords and agents can create property listings.",
        );
      }

      const baseSlug = slugify(`${form.title}-${form.city}-${form.location}`);

      let slug = baseSlug || `property-${Date.now()}`;

      /*
       * Make the slug unique.
       */
      const { data: existingSlug } = await supabase
        .from("properties")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingSlug) {
        slug = `${slug}-${Date.now().toString().slice(-6)}`;
      }

      const propertyPayload = {
        owner_id: user.id,

        title: form.title.trim(),

        slug,

        description: form.description.trim() || null,

        property_type: form.propertyType,

        listing_type: form.listingType,

        price: Number(form.price),

        bedrooms:
          landListing || commercialListing ? null : numberOrNull(form.bedrooms),

        bathrooms:
          landListing || commercialListing
            ? null
            : numberOrNull(form.bathrooms),

        area_sqft: numberOrNull(form.areaSqft),

        country: "Kenya",

        city: form.city.trim(),

        location: form.location.trim(),

        address: form.address.trim() || null,

        year_built: numberOrNull(form.yearBuilt),

        amenities: textArray(form.amenities),

        tags: textArray(form.tags),

        featured: form.featured,

        verification_status: "pending",

        listing_status: "active",

        last_confirmed_at: new Date().toISOString(),

        stale_after_days: 30,
      };

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert(propertyPayload)
        .select("id, slug")
        .single();

      if (propertyError) {
        throw new Error(propertyError.message);
      }

      if (!property) {
        throw new Error(
          "The property was created but no property ID was returned.",
        );
      }

      /*
       * Create the initial cost record.
       *
       * The base rent is already stored on properties.price.
       * The recurring additional costs start at zero and can
       * be completed from the property management page.
       */
      const { error: costError } = await supabase
        .from("property_costs")
        .insert({
          property_id: property.id,

          service_charge: 0,

          garbage_fee: 0,

          average_water_cost: 0,

          average_electricity_cost: 0,

          average_internet_cost: 0,

          other_monthly_cost: 0,

          notes: null,
        });

      if (costError) {
        console.error("Property cost record could not be created:", costError);
      }

      /*
       * Create the initial verification record.
       */
      const { error: verificationError } = await supabase
        .from("property_verifications")
        .insert({
          property_id: property.id,

          owner_identity_verified: false,

          agent_verified: false,

          location_verified: false,

          documents_verified: false,

          physical_inspection_verified: false,

          photos_verified: false,

          verification_notes: null,
        });

      if (verificationError) {
        console.error(
          "Verification record could not be created:",
          verificationError,
        );
      }

      setCreatedPropertyId(property.id);

      setCreatedPropertySlug(property.slug);

      setSuccess(
        hasUnits
          ? "Property created. Now add its individual units."
          : "Property created successfully. Continue to complete its information.",
      );
    } catch (caughtError) {
      console.error("Create property error:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "We could not create the property.",
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * After the property is created, send the owner to the
   * property management page.
   */
  function continueToProperty() {
    if (!createdPropertyId) {
      return;
    }

    window.location.href = `/dashboard/properties/${createdPropertyId}`;
  }

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

              <span>Add property</span>
            </div>

            <p className="dashboard-eyebrow">PROPERTY LISTING</p>

            <h1>Add a property</h1>

            <p className="dashboard-page-description">
              Tell KejaTrue what you are listing first. We will then collect the
              information that actually matters for that type of property.
            </p>
          </div>

          <Link
            href="/dashboard/properties"
            className="dashboard-secondary-button"
          >
            Cancel
          </Link>
        </section>

        {!createdPropertyId ? (
          <>
            {/* ==================================================
                STEP 1 — PROPERTY TYPE
            ================================================== */}

            <section className="management-card">
              <div className="management-card-heading">
                <div>
                  <span className="eyebrow">01 · Property type</span>

                  <h2>What are you listing?</h2>
                </div>

                <strong>Required</strong>
              </div>

              <p className="management-card-intro">
                Different properties need different information. Select the
                category that best describes this listing.
              </p>

              <div
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                role="radiogroup"
                aria-label="Property type"
              >
                {PROPERTY_TYPES.map((type) => {
                  const selected = form.propertyType === type.value;

                  return (
                    <button
                      type="button"
                      key={type.value}
                      onClick={() => updateForm("propertyType", type.value)}
                      className={[
                        "rounded-2xl border p-4 text-left transition",
                        selected
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white hover:border-black/30",
                      ].join(" ")}
                      role="radio"
                      aria-checked={selected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <strong>{type.value}</strong>

                        <span
                          className={[
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            selected
                              ? "border-white bg-white text-black"
                              : "border-black/20",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          {selected ? <HiCheck size={12} /> : null}
                        </span>
                      </div>

                      <p
                        className={
                          selected
                            ? "mt-2 text-sm text-white/70"
                            : "mt-2 text-sm text-black/55"
                        }
                      >
                        {type.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {form.propertyType && (
              <>
                {/* ==================================================
                    STEP 2 — BASIC DETAILS
                ================================================== */}

                <section className="management-card">
                  <div className="management-card-heading">
                    <div>
                      <span className="eyebrow">02 · Basic details</span>

                      <h2>About the property</h2>
                    </div>

                    <strong>{form.propertyType}</strong>
                  </div>

                  <div className="management-form-grid">
                    <label className="management-field management-field--full">
                      <span>
                        {hasUnits
                          ? "Property / development name *"
                          : "Property name *"}
                      </span>

                      <input
                        value={form.title}
                        onChange={(event) =>
                          updateForm("title", event.target.value)
                        }
                        placeholder={
                          form.propertyType === "Apartment"
                            ? "e.g. Sunrise Apartments"
                            : form.propertyType === "Gated Estate"
                              ? "e.g. Greenview Estate"
                              : "e.g. Four Bedroom Family Home"
                        }
                      />

                      <small>
                        {hasUnits
                          ? "Use the development or building name. Individual units will be added next."
                          : "Use a clear name that helps house hunters identify the property."}
                      </small>
                    </label>

                    <label className="management-field management-field--full">
                      <span>Description</span>

                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          updateForm("description", event.target.value)
                        }
                        rows={5}
                        placeholder="Describe the property, its surroundings, access, notable features and anything a renter should know."
                      />
                    </label>

                    <label className="management-field">
                      <span>City *</span>

                      <input
                        value={form.city}
                        onChange={(event) =>
                          updateForm("city", event.target.value)
                        }
                        placeholder="e.g. Nairobi"
                      />
                    </label>

                    <label className="management-field">
                      <span>Area / neighbourhood *</span>

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
                        placeholder="Street, building, road or nearby landmark"
                      />
                    </label>
                  </div>
                </section>

                {/* ==================================================
                    STEP 3 — PROPERTY-SPECIFIC DETAILS
                ================================================== */}

                <section className="management-card">
                  <div className="management-card-heading">
                    <div>
                      <span className="eyebrow">03 · Property details</span>

                      <h2>
                        {landListing
                          ? "Land information"
                          : commercialListing
                            ? "Commercial information"
                            : "Home information"}
                      </h2>
                    </div>
                  </div>

                  {landListing ? (
                    <div className="rounded-2xl border border-black/10 bg-black/2 p-5">
                      <p className="text-sm leading-6 text-black/60">
                        This is a land listing, so bedrooms, bathrooms and
                        residential unit details are not required.
                      </p>
                    </div>
                  ) : (
                    <div className="management-form-grid">
                      <label className="management-field">
                        <span>
                          {form.listingType === "rent"
                            ? "Starting monthly rent *"
                            : "Asking price *"}
                        </span>

                        <input
                          type="number"
                          min="0"
                          value={form.price}
                          onChange={(event) =>
                            updateForm("price", event.target.value)
                          }
                          placeholder="25000"
                        />

                        <small>
                          For multi-unit properties, this becomes the starting
                          price. Individual units can have their own rent.
                        </small>
                      </label>

                      {residentialListing && (
                        <>
                          <label className="management-field">
                            <span>Bedrooms</span>

                            <input
                              type="number"
                              min="0"
                              value={form.bedrooms}
                              onChange={(event) =>
                                updateForm("bedrooms", event.target.value)
                              }
                              placeholder="2"
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
                              placeholder="2"
                            />
                          </label>
                        </>
                      )}

                      <label className="management-field">
                        <span>Area (sq ft)</span>

                        <input
                          type="number"
                          min="0"
                          value={form.areaSqft}
                          onChange={(event) =>
                            updateForm("areaSqft", event.target.value)
                          }
                          placeholder="850"
                        />
                      </label>

                      <label className="management-field">
                        <span>Year built</span>

                        <input
                          type="number"
                          min="1800"
                          max={new Date().getFullYear()}
                          value={form.yearBuilt}
                          onChange={(event) =>
                            updateForm("yearBuilt", event.target.value)
                          }
                          placeholder="2024"
                        />
                      </label>

                      <label className="management-field">
                        <span>Listing type</span>

                        <select
                          value={form.listingType}
                          onChange={(event) =>
                            updateForm(
                              "listingType",
                              event.target.value as "rent" | "sale",
                            )
                          }
                        >
                          <option value="rent">For rent</option>

                          <option value="sale">For sale</option>
                        </select>
                      </label>

                      <div className="management-checkbox">
                        <input
                          type="checkbox"
                          checked={form.furnished}
                          onChange={(event) =>
                            updateForm("furnished", event.target.checked)
                          }
                        />

                        <span>
                          <strong>Furnished</strong>

                          <small>
                            The property or unit is offered furnished.
                          </small>
                        </span>
                      </div>

                      <div className="management-checkbox">
                        <input
                          type="checkbox"
                          checked={form.parking}
                          onChange={(event) =>
                            updateForm("parking", event.target.checked)
                          }
                        />

                        <span>
                          <strong>Parking available</strong>

                          <small>Parking is available on the property.</small>
                        </span>
                      </div>

                      <div className="management-checkbox">
                        <input
                          type="checkbox"
                          checked={form.waterAvailable}
                          onChange={(event) =>
                            updateForm("waterAvailable", event.target.checked)
                          }
                        />

                        <span>
                          <strong>Water available</strong>

                          <small>
                            Water connection is available at the property.
                          </small>
                        </span>
                      </div>

                      <div className="management-checkbox">
                        <input
                          type="checkbox"
                          checked={form.electricityAvailable}
                          onChange={(event) =>
                            updateForm(
                              "electricityAvailable",
                              event.target.checked,
                            )
                          }
                        />

                        <span>
                          <strong>Electricity available</strong>

                          <small>Electricity connection is available.</small>
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="management-form-grid mt-6">
                    <label className="management-field management-field--full">
                      <span>Amenities</span>

                      <input
                        value={form.amenities}
                        onChange={(event) =>
                          updateForm("amenities", event.target.value)
                        }
                        placeholder="Parking, Balcony, CCTV, Borehole, Gym, Lift"
                      />

                      <small>Separate amenities with commas.</small>
                    </label>

                    <label className="management-field management-field--full">
                      <span>Search tags</span>

                      <input
                        value={form.tags}
                        onChange={(event) =>
                          updateForm("tags", event.target.value)
                        }
                        placeholder="family, student, furnished, near CBD"
                      />

                      <small>
                        These help KejaTrue match the listing to relevant
                        searches.
                      </small>
                    </label>
                  </div>
                </section>

                {/* ==================================================
                    STEP 4 — MULTI UNIT EXPLANATION
                ================================================== */}

                {hasUnits && (
                  <section className="management-card">
                    <div className="management-card-heading">
                      <div>
                        <span className="eyebrow">04 · Unit inventory</span>

                        <h2>This property contains multiple units</h2>
                      </div>

                      <strong>Add after creation</strong>
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-black/2 p-6">
                      <div className="grid gap-5 md:grid-cols-3">
                        <div>
                          <strong>1A</strong>

                          <p className="mt-1 text-sm text-black/55">
                            1 bedroom · KSh 25,000
                          </p>
                        </div>

                        <div>
                          <strong>2A</strong>

                          <p className="mt-1 text-sm text-black/55">
                            2 bedrooms · KSh 32,000
                          </p>
                        </div>

                        <div>
                          <strong>3C</strong>

                          <p className="mt-1 text-sm text-black/55">
                            2 bedrooms · KSh 35,000
                          </p>
                        </div>
                      </div>

                      <p className="mt-6 text-sm leading-6 text-black/60">
                        After creating this property, you will be taken to its
                        management page where you can add every individual unit
                        and mark each one as available, reserved or occupied.
                      </p>
                    </div>
                  </section>
                )}

                {/* ==================================================
                    STEP 5 — PUBLISH
                ================================================== */}

                <section className="management-card">
                  <div className="management-card-heading">
                    <div>
                      <span className="eyebrow">
                        {hasUnits ? "05" : "04"} · Publish
                      </span>

                      <h2>Create listing</h2>
                    </div>
                  </div>

                  <p className="management-card-intro">
                    Your listing will begin with a pending verification status.
                    You can then add costs, verification evidence, photos, units
                    and other information from the property management page.
                  </p>

                  {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {success}
                    </div>
                  )}

                  <div className="management-checkbox mb-6">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(event) =>
                        updateForm("featured", event.target.checked)
                      }
                    />

                    <span>
                      <strong>Feature this listing</strong>

                      <small>
                        Only use this for properties you want highlighted.
                      </small>
                    </span>
                  </div>

                  <div className="management-card-footer">
                    <span>
                      You can edit everything after creating the property.
                    </span>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={saving}
                      onClick={createProperty}
                    >
                      {saving ? "Creating property…" : "Create property"}
                    </button>
                  </div>
                </section>
              </>
            )}
          </>
        ) : (
          /* ========================================================
             CREATED PROPERTY
          ======================================================== */

          <section className="management-card">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black text-2xl text-white">
                <HiCheck aria-hidden="true" />
              </div>

              <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-black/45">
                PROPERTY CREATED
              </p>

              <h2 className="mt-2 text-3xl font-semibold">
                {hasUnits
                  ? "Your property is ready for its units."
                  : "Your property has been created."}
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-black/60">
                {hasUnits
                  ? "Now add the individual apartments, houses or rooms that are actually available to house hunters."
                  : "Continue to the property management page to complete its costs, verification evidence, photos and other details."}
              </p>

              {hasUnits && (
                <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-black/10 bg-black/2 p-6 text-left">
                  <strong>Next: add individual units</strong>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {["Apartment 1A", "Apartment 2A", "Apartment 3C"].map(
                      (example) => (
                        <div
                          key={example}
                          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
                        >
                          {example}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={continueToProperty}
                  className="dashboard-primary-button"
                >
                  {hasUnits
                    ? "Manage property & add units"
                    : "Complete property"}
                </button>

                <Link
                  href="/dashboard/properties"
                  className="dashboard-secondary-button"
                >
                  Back to properties
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
