"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../../backend/supabase/client";
import { SiteFooter, SiteNavbar } from "../../../components/site-chrome";

export default function NewPropertyPage() {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const { error } = await createClient()
      .from("properties")
      .insert({
        title: values.title,
        description: values.description,
        location: values.location,
        property_type: values.property_type,
        price: Number(values.price),
        bedrooms: Number(values.bedrooms),
        bathrooms: Number(values.bathrooms),
        thumbnail: values.thumbnail || null,
      });
    setMessage(
      error
        ? error.message
        : "Property submitted. It will appear once it is published.",
    );
    if (!error) event.currentTarget.reset();
    setIsSaving(false);
  }

  return (
    <main className="form-page">
      <SiteNavbar backHref="/dashboard" backLabel="Back to dashboard" />
      <section className="form-content">
        <span className="eyebrow">New property</span>
        <h1>Give people the full picture.</h1>
        <p className="form-intro">
          Start with the facts you know. You can add more transparency signals
          as they become available.
        </p>
        <form className="property-form" onSubmit={submit}>
          <label>
            Property title
            <input name="title" placeholder="e.g. The Olive House" required />
          </label>
          <label>
            Location
            <input
              name="location"
              placeholder="e.g. Kilimani, Nairobi"
              required
            />
          </label>
          <div className="form-row">
            <label>
              Property type
              <select name="property_type" defaultValue="Apartment">
                <option>Apartment</option>
                <option>Townhouse</option>
                <option>Studio</option>
                <option>House</option>
              </select>
            </label>
            <label>
              Monthly rent
              <input
                name="price"
                type="number"
                min="0"
                placeholder="68000"
                required
              />
            </label>
          </div>
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
            Photo URL
            <input name="thumbnail" type="url" placeholder="https://..." />
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={5}
              placeholder="What should a house hunter know before they visit?"
            />
          </label>
          <button
            type="submit"
            className="dark-button form-submit"
            disabled={isSaving}
          >
            {isSaving ? "Submitting..." : "Submit property"}
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
