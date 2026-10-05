import Link from "next/link";
import {
  HiArrowDown,
  HiArrowUpRight,
  HiBuildingOffice2,
  HiChatBubbleLeftRight,
  HiCheck,
  HiCheckCircle,
  HiCurrencyDollar,
  HiHome,
  HiKey,
  HiMagnifyingGlass,
  HiMap,
  HiShieldCheck,
  HiSparkles,
} from "react-icons/hi2";
import { createClient } from "./backend/supabase/server";
import HouseHunterHome from "./components/house-hunter-home";
import { BrandLink, SiteFooter } from "./components/site-chrome";
import { normalizeRole } from "./lib/roles";

const audiences = [
  {
    role: "House hunter",
    title: "Find a home with more of the truth.",
    description:
      "Search homes, compare real monthly costs and understand the area before you decide.",
    href: "/listings",
    action: "Explore homes",
    icon: HiHome,
  },
  {
    role: "Agent",
    title: "Manage your listings with confidence.",
    description:
      "Create detailed listings, respond to enquiries and give house hunters better information.",
    href: "/auth?role=agent",
    action: "Join as an agent",
    icon: HiBuildingOffice2,
  },
  {
    role: "Landlord",
    title: "Show people the full picture.",
    description:
      "Present your property clearly, manage enquiries and build trust through better information.",
    href: "/auth?role=landlord",
    action: "Join as a landlord",
    icon: HiKey,
  },
];

const intelligenceFeatures = [
  {
    number: "01",
    title: "True monthly cost",
    description:
      "Rent is only the beginning. See recurring charges and everyday costs together.",
    icon: HiCurrencyDollar,
  },
  {
    number: "02",
    title: "Property trust",
    description:
      "Understand what has been verified, what remains unverified and why the property received its trust score.",
    icon: HiShieldCheck,
  },
  {
    number: "03",
    title: "Area intelligence",
    description:
      "Water, network, security, roads, lighting, flood risk and noise belong beside the property.",
    icon: HiMap,
  },
  {
    number: "04",
    title: "Lived experience",
    description:
      "Reviews and reports help house hunters understand what a listing alone cannot tell them.",
    icon: HiChatBubbleLeftRight,
  },
];

const steps = [
  {
    number: "01",
    title: "Discover",
    text: "Search homes by location, budget, property type and the things that matter to you.",
    icon: HiMagnifyingGlass,
  },
  {
    number: "02",
    title: "Understand",
    text: "Look beyond rent. See recurring costs, verification, utilities and area intelligence.",
    icon: HiSparkles,
  },
  {
    number: "03",
    title: "Compare",
    text: "Put properties side by side using information that actually affects your decision.",
    icon: HiCheckCircle,
  },
  {
    number: "04",
    title: "Visit",
    text: "Request a viewing and connect with the agent or landlord when you're ready.",
    icon: HiHome,
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ workspace?: string }> | { workspace?: string };
}) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestedWorkspace = normalizeRole(resolvedSearchParams?.workspace);
  const normalizedUserRole = normalizeRole(user?.user_metadata?.role);

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  const normalizedProfileRole = normalizeRole(profile?.role);

  const isHouseHunterWorkspace =
    requestedWorkspace === "house-hunter" ||
    normalizedUserRole === "house-hunter" ||
    normalizedProfileRole === "house-hunter";

  if (isHouseHunterWorkspace) {
    return <HouseHunterHome />;
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
            Create account <HiArrowUpRight aria-hidden="true" />
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
              Explore homes <HiArrowUpRight aria-hidden="true" />
            </Link>

            <Link href="#how-it-works" className="text-button">
              See how it works <HiArrowDown aria-hidden="true" />
            </Link>
          </div>

          <div className="landing-trust-line">
            <span>
              <HiCheckCircle aria-hidden="true" /> Real monthly costs
            </span>
            <span>
              <HiShieldCheck aria-hidden="true" /> Verification signals
            </span>
            <span>
              <HiMap aria-hidden="true" /> Area intelligence
            </span>
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
              <span>
                <HiCheck aria-hidden="true" />
              </span>
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
          <span className="landing-search-icon">
            <HiMagnifyingGlass aria-hidden="true" />
          </span>
          Search homes by location, budget or property type
          <b aria-hidden="true">
            <HiArrowUpRight />
          </b>
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
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.number}>
                <span className="landing-step-number">{step.number}</span>

                <div className="landing-step-icon">
                  <Icon aria-hidden="true" />
                </div>

                <h3>{step.title}</h3>

                <p>{step.text}</p>
              </article>
            );
          })}
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
          {intelligenceFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.number}>
                <strong>{feature.number}</strong>

                <span>
                  <b>
                    <Icon aria-hidden="true" />
                    {feature.title}
                  </b>

                  {feature.description}
                </span>
              </div>
            );
          })}
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
          {audiences.map((audience) => {
            const Icon = audience.icon;

            return (
              <article className="audience-card" key={audience.role}>
                <div className="audience-card-header">
                  <span className="audience-icon">
                    <Icon aria-hidden="true" />
                  </span>

                  <span className="eyebrow">{audience.role}</span>
                </div>

                <h3>{audience.title}</h3>

                <p>{audience.description}</p>

                <Link href={audience.href} className="text-button">
                  {audience.action} <HiArrowUpRight aria-hidden="true" />
                </Link>
              </article>
            );
          })}
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
          Explore homes <HiArrowUpRight aria-hidden="true" />
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
