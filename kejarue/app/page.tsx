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
      "Understand what has been verified, what remains unverified and why the property received its trust score.",
  },
  {
    number: "03",
    title: "Area intelligence",
    description:
      "Water, network, security, roads, lighting, flood risk and noise belong beside the property.",
  },
  {
    number: "04",
    title: "Lived experience",
    description:
      "Reviews and reports help house hunters understand what a listing alone cannot tell them.",
  },
];

const steps = [
  {
    number: "01",
    title: "Discover",
    text: "Search homes by location, budget, property type and the things that matter to you.",
  },
  {
    number: "02",
    title: "Understand",
    text: "Look beyond rent. See recurring costs, verification, utilities and area intelligence.",
  },
  {
    number: "03",
    title: "Compare",
    text: "Put properties side by side using information that actually affects your decision.",
  },
  {
    number: "04",
    title: "Visit",
    text: "Request a viewing and connect with the agent or landlord when you're ready.",
  },
];

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.user_metadata?.role === "house-hunter") {
    return <HouseHunterHome userEmail={user.email} />;
  }

  return (
    <main className="landing-page">
      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <header className="landing-nav">
        <BrandLink />

        <nav aria-label="Main navigation">
          <Link href="/listings">Find a home</Link>
          <Link href="#how-it-works">How it works</Link>
          <Link href="#intelligence">Intelligence</Link>
          <Link href="#professionals">For professionals</Link>
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

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="landing-hero landing-hero-new">
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
              See how it works <span>↓</span>
            </Link>
          </div>

          <div className="landing-trust-line">
            <span>✓ Real monthly costs</span>
            <span>✓ Verification signals</span>
            <span>✓ Area intelligence</span>
          </div>
        </div>

        <div className="landing-hero-visual landing-hero-visual-new">
          <div className="landing-photo-frame">
            <img
              src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85"
              alt="Modern apartment interior"
            />

            <div className="landing-photo-overlay">
              <span className="eyebrow">Featured example</span>

              <h3>The Olive House</h3>

              <p>Kilimani · Nairobi</p>
            </div>

            <div className="landing-photo-badge">
              <span>✓</span>
              Verified signals
            </div>
          </div>

          <div className="landing-floating-card landing-floating-card-new">
            <span className="eyebrow">True monthly cost</span>

            <strong>KSh 76,500</strong>

            <div className="landing-cost-breakdown">
              <span>Rent</span>
              <b>KSh 68,000</b>

              <span>Recurring costs</span>
              <b>KSh 8,500</b>
            </div>

            <small>The number that matters before you commit.</small>
          </div>

          <div className="landing-score-card">
            <span className="eyebrow">Trust score</span>

            <strong>88</strong>

            <small>Strong verification signals</small>
          </div>
        </div>
      </section>

      {/* =====================================================
          SEARCH CTA
      ====================================================== */}

      <section className="landing-search-section">
        <div>
          <span className="eyebrow">Start your search</span>

          <h2>What kind of home are you looking for?</h2>
        </div>

        <Link href="/listings" className="landing-search-button">
          <span>⌕</span>
          Search homes by location, budget or property type
          <b>↗</b>
        </Link>
      </section>

      {/* =====================================================
          HOW IT WORKS
      ====================================================== */}

      <section className="landing-how landing-section-new" id="how-it-works">
        <div className="landing-section-intro">
          <span className="eyebrow">How KejaTrue works</span>

          <h2>
            House hunting should feel like
            <em> research,</em> not guesswork.
          </h2>
        </div>

        <div className="landing-process">
          {steps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>

              <h3>{step.title}</h3>

              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================
          INTELLIGENCE
      ====================================================== */}

      <section
        className="landing-features landing-section-new"
        id="intelligence"
      >
        <div className="landing-features-heading">
          <span className="eyebrow">Property intelligence</span>

          <h2>
            The details that can change
            <em> a decision.</em>
          </h2>

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

      {/* =====================================================
          THREE USERS
      ====================================================== */}

      <section
        className="landing-audiences landing-section-new"
        id="professionals"
      >
        <div className="landing-section-intro">
          <span className="eyebrow">One platform, three perspectives</span>

          <h2>
            Built around the people who actually
            <em> use property information.</em>
          </h2>
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

      {/* =====================================================
          FINAL CTA
      ====================================================== */}

      <section className="landing-cta landing-cta-new">
        <span className="eyebrow">
          Your next move deserves better information
        </span>

        <h2>
          Find a place you can
          <em> actually understand.</em>
        </h2>

        <p>
          Search properties, understand the real costs and make your next move
          with more confidence.
        </p>

        <Link href="/listings" className="dark-button">
          Explore homes <span>↗</span>
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
