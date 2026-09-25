import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../backend/supabase/server";
import { mapProperty } from "../../lib/properties";
import { SiteFooter, SiteNavbar } from "../../components/site-chrome";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) notFound();
  const property = mapProperty(data);

  return (
    <main className="detail-page">
      <SiteNavbar backHref="/" backLabel="Back to homes" />
      <section className="detail-content">
        <div className="detail-crumb">
          <Link href="/">Discover</Link>
          <span>/</span>
          {property.title}
        </div>
        <div className="detail-hero">
          <div
            className="detail-image"
            style={{ backgroundImage: `url(${property.image})` }}
          >
            <span className="match-badge">
              {property.verified
                ? "Verified listing"
                : "Verification in progress"}
            </span>
          </div>
          <div className="detail-summary">
            <span className="eyebrow">
              {property.type} · {property.location}
            </span>
            <h1>{property.title}</h1>
            <p>{property.description}</p>
            <div className="detail-cost">
              <span className="eyebrow">True estimated monthly cost</span>
              <strong>{money.format(property.total)}</strong>
              <small>
                Rent {money.format(property.rent)} · additional costs shown from
                reported data
              </small>
            </div>
            <button type="button" className="dark-button">
              Save property <span>♡</span>
            </button>
          </div>
        </div>
        <div className="intelligence-panel">
          <div>
            <span className="eyebrow">Property intelligence</span>
            <h2>What the listing tells us</h2>
          </div>
          <div className="intelligence-metrics">
            <div>
              <span>Water reliability</span>
              <strong>{property.water}</strong>
            </div>
            <div>
              <span>Network quality</span>
              <strong>{property.network}</strong>
            </div>
            <div>
              <span>Bedrooms</span>
              <strong>{property.bedrooms || "—"}</strong>
            </div>
            <div>
              <span>Bathrooms</span>
              <strong>{property.bathrooms || "—"}</strong>
            </div>
          </div>
        </div>
        <div className="detail-note">
          <span className="banner-mark">✦</span>
          <div>
            <h2>Transparency is a feature.</h2>
            <p>
              Some answers are still being collected. KejaTrue keeps the gaps
              visible so you know what to ask next.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
