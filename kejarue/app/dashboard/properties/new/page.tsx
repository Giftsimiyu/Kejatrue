"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../../backend/supabase/client";
import { SiteFooter, SiteNavbar } from "../../../components/site-chrome";

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function NewPropertyPage() {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());

    const supabase = createClient();

    // -----------------------------------------
    // 1. Make sure the user is signed in
    // -----------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setMessage("You must be signed in to add a property.");
      setIsSaving(false);
      return;
    }

    // -----------------------------------------
    // 2. Check the user's KejaTrue role
    // -----------------------------------------

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !["agent", "landlord"].includes(String(profile.role))
    ) {
      setMessage("Only an agent or landlord can add a property.");
      setIsSaving(false);
      return;
    }

    // -----------------------------------------
    // 3. Read form values
    // -----------------------------------------

    const title = String(values.title || "").trim();

    const description = String(values.description || "").trim();

    const location = String(values.location || "").trim();

    const city = String(values.city || "").trim();

    const address = String(values.address || "").trim();

    const propertyType = String(values.property_type || "Apartment");

    const price = Number(values.price || 0);

    const bedrooms = Number(values.bedrooms || 0);

    const bathrooms = Number(values.bathrooms || 0);

    const areaSqft = values.area_sqft ? Number(values.area_sqft) : null;

    const thumbnail = String(values.thumbnail || "").trim();

    // -----------------------------------------
    // 4. Generate a unique slug
    // -----------------------------------------

    const slugBase = makeSlug(title) || `property-${Date.now()}`;

    const { data: existingSlug } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", slugBase)
      .maybeSingle();

    const slug = existingSlug ? `${slugBase}-${Date.now()}` : slugBase;

    // -----------------------------------------
    // 5. Create the property
    // -----------------------------------------

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .insert({
        owner_id: user.id,
        title,
        slug,
        description: description || null,
        location,
        city: city || null,
        address: address || null,
        property_type: propertyType,
        listing_type: "rent",
        price,
        bedrooms,
        bathrooms,
        area_sqft: areaSqft,
        thumbnail: thumbnail || null,
        verification_status: "pending",
        featured: false,
      })
      .select("id")
      .single();

    if (propertyError || !property) {
      setMessage(
        propertyError?.message || "The property could not be created.",
      );
      setIsSaving(false);
      return;
    }

    // -----------------------------------------
    // 6. Save monthly costs
    // -----------------------------------------

    const { error: costsError } = await supabase.from("property_costs").insert({
      property_id: property.id,

      service_charge: Number(values.service_charge || 0),

      garbage_fee: Number(values.garbage_fee || 0),

      average_water_cost: Number(values.average_water_cost || 0),

      average_electricity_cost: Number(values.average_electricity_cost || 0),

      average_internet_cost: Number(values.average_internet_cost || 0),

      other_monthly_cost: Number(values.other_monthly_cost || 0),

      notes: String(values.cost_notes || "").trim() || null,
    });

    if (costsError) {
      // Remove the property if
      // the cost record failed.
      await supabase.from("properties").delete().eq("id", property.id);

      setMessage(
        "Property was created, but the monthly costs could not be saved: " +
          costsError.message,
      );

      setIsSaving(false);
      return;
    }

    // -----------------------------------------
    // 7. Create verification record
    // -----------------------------------------

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

        verification_notes: "New listing awaiting verification.",
      });

    if (verificationError) {
      // Roll everything back if
      // verification setup fails.

      await supabase
        .from("property_costs")
        .delete()
        .eq("property_id", property.id);

      await supabase.from("properties").delete().eq("id", property.id);

      setMessage(
        "Property was created, but verification setup failed: " +
          verificationError.message,
      );

      setIsSaving(false);
      return;
    }

    // -----------------------------------------
    // 8. Success
    // -----------------------------------------

    setMessage(
      "Property created successfully. It is now pending verification.",
    );

    form.reset();

    setIsSaving(false);
  }

  return (
    <main className="form-page">
      <SiteNavbar backHref="/dashboard" backLabel="Back to dashboard" />

      <section className="form-content">
        <span className="eyebrow">New property</span>

        <h1>Give people the full picture.</h1>

        <p className="form-intro">
          Start with the facts you know. KejaTrue will calculate transparency
          signals from the information you provide.
        </p>

        <form className="property-form" onSubmit={submit}>
          {/* PROPERTY BASICS */}

          <label>
            Property title
            <input name="title" placeholder="e.g. The Olive House" required />
          </label>

          <label>
            Location / area
            <input name="location" placeholder="e.g. Kilimani" required />
          </label>

          <div className="form-row">
            <label>
              City
              <input name="city" placeholder="e.g. Nairobi" />
            </label>

            <label>
              Address
              <input name="address" placeholder="Street / building" />
            </label>
          </div>

          {/* PROPERTY TYPE + RENT */}

          <div className="form-row">
            <label>
              Property type
              <select name="property_type" defaultValue="Apartment">
                <option value="Apartment">Apartment</option>

                <option value="Townhouse">Townhouse</option>

                <option value="Studio">Studio</option>

                <option value="House">House</option>

                <option value="Bedsitter">Bedsitter</option>

                <option value="Maisonette">Maisonette</option>
              </select>
            </label>

            <label>
              Monthly rent (KSh)
              <input
                name="price"
                type="number"
                min="0"
                step="1"
                placeholder="68000"
                required
              />
            </label>
          </div>

          {/* BEDROOMS + BATHROOMS */}

          <div className="form-row">
            <label>
              Bedrooms
              <input
                name="bedrooms"
                type="number"
                min="0"
                placeholder="2"
                required
              />
            </label>

            <label>
              Bathrooms
              <input
                name="bathrooms"
                type="number"
                min="0"
                placeholder="2"
                required
              />
            </label>
          </div>

          <label>
            Floor area (sq ft)
            <input name="area_sqft" type="number" min="0" placeholder="1200" />
          </label>

          {/* MONTHLY COSTS */}

          <div className="form-row">
            <label>
              Service charge (monthly)
              <input
                name="service_charge"
                type="number"
                min="0"
                defaultValue="0"
              />
            </label>

            <label>
              Garbage fee (monthly)
              <input
                name="garbage_fee"
                type="number"
                min="0"
                defaultValue="0"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Average water cost
              <input
                name="average_water_cost"
                type="number"
                min="0"
                defaultValue="0"
              />
            </label>

            <label>
              Average electricity cost
              <input
                name="average_electricity_cost"
                type="number"
                min="0"
                defaultValue="0"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Average internet cost
              <input
                name="average_internet_cost"
                type="number"
                min="0"
                defaultValue="0"
              />
            </label>

            <label>
              Other monthly costs
              <input
                name="other_monthly_cost"
                type="number"
                min="0"
                defaultValue="0"
              />
            </label>
          </div>

          <label>
            Cost notes
            <textarea
              name="cost_notes"
              rows={3}
              placeholder="Explain anything unusual about recurring costs."
            />
          </label>

          {/* MEDIA */}

          <label>
            Thumbnail URL
            <input name="thumbnail" type="url" placeholder="https://..." />
          </label>

          {/* DESCRIPTION */}

          <label>
            Description
            <textarea
              name="description"
              rows={5}
              placeholder="What should a house hunter know before they visit?"
            />
          </label>

          {/* SUBMIT */}

          <button
            type="submit"
            className="dark-button form-submit"
            disabled={isSaving}
          >
            {isSaving ? "Creating property..." : "Create property"}

            <span>↗</span>
          </button>

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}
        </form>
      </section>

      <SiteFooter />
    </main>
  );
}
