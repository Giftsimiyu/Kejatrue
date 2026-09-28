import Link from "next/link";
import { createClient } from "./backend/supabase/server";
import HouseHunterHome from "./components/house-hunter-home";
import { BrandLink, SiteFooter } from "./components/site-chrome";

const audiences = [
  {
    role: "House hunter",
    title: "Find a home with more of the truth.",
    description:
      "Search homes, compare real monthly costs and understand the area before you decide.",
    href: "/listings",
    action: "Explore homes",
  },
  {
    role: "Agent",
    title: "Manage your listings with confidence.",
    description:
      "Create detailed listings, respond to enquiries and give house hunters better information.",
    href: "/auth?role=agent",
    action: "Join as an agent",
  },
  {
    role: "Landlord",
    title: "Show people the full picture.",
    description:
      "Present your property clearly, manage enquiries and build trust through better information.",
    href: "/auth?role=landlord",
    action: "Join as a landlord",
  },
];

const intelligenceFeatures = [
  {
    number: "01",
    title: "True monthly cost",
    description:
      "Rent is only the beginning. See recurring charges and everyday costs together.",
  },
  {
    number: "02",
    title: "Property trust",
    description:
      "Verification information helps people understand what has been checked and what still needs confirmation.",
  },
  {
    number: "03",
    title: "Area intelligence",
    description:
      "Water, network, security, roads, lighting, flood risk and other area factors belong beside the property.",
  },
  {
    number: "04",
    title: "Lived experience",
    description:
      "Reviews and property reports help house hunters understand what a listing alone cannot tell them.",
  },
];

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * A signed-in house hunter gets their personal
   * workspace instead of the public landing page.
   *
   * Agents and landlords continue to use the
   * professional dashboard.
   */
  if (user?.user_metadata?.role === "house-hunter") {
    return <HouseHunterHome userEmail={user.email} />;
  }

  return (
    <main className="landing-page">
      {/* =========================================
          NAVIGATION
      ========================================== */}

      <header className="landing-nav">
        <BrandLink />

        <nav aria-label="Main navigation">
          <Link href="/listings">Find a home</Link>

          <Link href="#how-it-works">How it works</Link>

          <Link href="#for-everyone">For professionals</Link>

          <Link href="/about">About</Link>
        </nav>

        <div className="landing-actions">
          <Link href="/auth?mode=sign-in" className="text-button">
            Sign in
          </Link>

          <Link href="/auth" className="dark-button">
            Create account <span>↗</span>
          </Link>
        </div>
      </header>

      {/* =========================================
          HERO
      ========================================== */}

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="eyebrow">Property intelligence for Kenya</span>

          <h1>
            Find a home with
            <em> more of the truth.</em>
          </h1>

          <p>
            KejaTrue brings property listings, real monthly costs, verification,
            area intelligence and lived experience into one place.
          </p>

          <div className="landing-hero-actions">
            <Link href="/listings" className="dark-button">
              Explore homes <span>↗</span>
            </Link>

            <Link href="#how-it-works" className="text-button">
              See how KejaTrue works <span>↓</span>
            </Link>
          </div>

          <div className="landing-hero-note">
            <span className="landing-note-mark">K</span>

            <div>
              <span className="eyebrow">The KejaTrue principle</span>

              <h2>Good listings answer questions before they are asked.</h2>

              <p>
                We believe choosing a home should involve more than a rent price
                and a few photos.
              </p>
            </div>
          </div>
        </div>

        {/* =====================================
            HERO VISUAL
        ====================================== */}

        <div className="landing-hero-visual">
          <div className="landing-property-window">
            <div className="landing-property-image">
              <span>KEJATRUE</span>
            </div>

            <div className="landing-property-info">
              <div>
                <span className="eyebrow">Example property</span>

                <h3>The Olive House</h3>

                <p>Kilimani · Nairobi</p>
              </div>

              <strong>
                KSh 68,000
                <small>/ month</small>
              </strong>
            </div>

            <div className="landing-property-signals">
              <span>✓ Verified</span>

              <span>Water 86</span>

              <span>Network 91</span>

              <span>Trust 88</span>
            </div>
          </div>

          <div className="landing-floating-card">
            <span className="eyebrow">True monthly cost</span>

            <strong>KSh 76,500</strong>

            <small>Rent + recurring property costs</small>
          </div>
        </div>
      </section>

      {/* =========================================
          HOW IT WORKS
      ========================================== */}

      <section className="landing-how" id="how-it-works">
        <div className="landing-section-intro">
          <span className="eyebrow">How KejaTrue works</span>

          <h2>
            One property.
            <br />
            More of the information that matters.
          </h2>
        </div>

        <div className="landing-process">
          <article>
            <span>01</span>

            <h3>Discover</h3>

            <p>
              Browse properties and search by location, budget, property type
              and other requirements.
            </p>
          </article>

          <article>
            <span>02</span>

            <h3>Understand</h3>

            <p>
              Look beyond the advertised rent. See recurring costs, utilities,
              verification and area information.
            </p>
          </article>

          <article>
            <span>03</span>

            <h3>Compare</h3>

            <p>
              Compare properties using the information that actually affects
              your decision.
            </p>
          </article>

          <article>
            <span>04</span>

            <h3>Connect</h3>

            <p>
              Request a viewing or contact the agent or landlord when
              you&apos;re ready.
            </p>
          </article>
        </div>
      </section>

      {/* =========================================
          THREE USERS
      ========================================== */}

      <section className="landing-audiences" id="for-everyone">
        <div className="landing-section-intro">
          <span className="eyebrow">One platform, three perspectives</span>

          <h2>KejaTrue works differently depending on what you need to do.</h2>
        </div>

        <div className="audience-grid">
          {audiences.map((audience) => (
            <article className="audience-card" key={audience.role}>
              <span className="eyebrow">{audience.role}</span>

              <h3>{audience.title}</h3>

              <p>{audience.description}</p>

              <Link href={audience.href} className="text-button">
                {audience.action} <span>↗</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* =========================================
          INTELLIGENCE
      ========================================== */}

      <section className="landing-features">
        <div>
          <span className="eyebrow">Property intelligence</span>

          <h2>The details that can change a decision.</h2>

          <p className="landing-feature-intro">
            KejaTrue is designed to bring the information people normally have
            to gather from several places into one property experience.
          </p>
        </div>

        <div className="feature-list">
          {intelligenceFeatures.map((feature) => (
            <div key={feature.number}>
              <strong>{feature.number}</strong>

              <span>
                <b>{feature.title}</b>

                {feature.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          PROFESSIONAL CTA
      ========================================== */}

      <section className="landing-professional">
        <div>
          <span className="eyebrow">For agents & landlords</span>

          <h2>Your listing should tell the whole story.</h2>

          <p>
            Add properties, provide accurate costs and information, respond to
            enquiries and build a stronger relationship with prospective
            tenants.
          </p>
        </div>

        <div className="landing-professional-actions">
          <Link href="/auth?role=agent" className="dark-button">
            Join as an agent <span>↗</span>
          </Link>

          <Link href="/auth?role=landlord" className="text-button">
            Join as a landlord <span>↗</span>
          </Link>
        </div>
      </section>

      {/* =========================================
          FINAL CTA
      ========================================== */}

      <section className="landing-cta">
        <span className="eyebrow">Start with what matters</span>

        <h2>
          Find a place you can
          <em> actually understand.</em>
        </h2>

        <Link href="/listings" className="dark-button">
          Explore homes <span>↗</span>
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
