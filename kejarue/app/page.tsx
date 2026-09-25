import Link from "next/link";
import { createClient } from "./backend/supabase/server";
import HouseHunterHome from "./components/house-hunter-home";
import { BrandLink, SiteFooter } from "./components/site-chrome";

const audiences = [
  {
    eyebrow: "For house hunters",
    title: "Find a home with the full story.",
    description:
      "Compare real monthly costs, utilities and lived details before you commit.",
    href: "/listings",
    action: "Explore homes",
  },
  {
    eyebrow: "For agents",
    title: "Make every listing more useful.",
    description:
      "Manage properties, answer questions and build trust with better information.",
    href: "/auth",
    action: "Join as an agent",
  },
  {
    eyebrow: "For landlords",
    title: "Show what your property is really saying.",
    description:
      "Share accurate details, understand performance and make your property easier to choose.",
    href: "/auth",
    action: "Join as a landlord",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { workspace } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    user?.user_metadata?.role === "house-hunter" ||
    (user && workspace === "house-hunter")
  ) {
    return <HouseHunterHome userEmail={user.email} />;
  }

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <BrandLink />
        <nav aria-label="Public navigation">
          <Link href="/listings">Find a home</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="landing-actions">
          <Link href="/auth" className="text-button">
            Sign in
          </Link>
          <Link href="/auth" className="dark-button">
            Create account <span>↗</span>
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="eyebrow">Property intelligence for Kenya</span>
          <h1>
            A clearer way to choose, share and manage <em>home.</em>
          </h1>
          <p>
            KejaTrue brings house hunters, agents and landlords into one more
            transparent property experience.
          </p>
          <div className="landing-hero-actions">
            <Link href="/listings" className="dark-button">
              Explore homes <span>↗</span>
            </Link>
            <Link href="/auth" className="text-button">
              Create an account <span>↗</span>
            </Link>
          </div>
        </div>
        <div className="landing-hero-note">
          <span className="landing-note-mark">K</span>
          <span className="eyebrow">The KejaTrue principle</span>
          <h2>Good listings answer questions before they are asked.</h2>
          <p>
            Costs, utilities, verification and lived experience belong in the
            same conversation.
          </p>
        </div>
      </section>

      <section className="landing-audiences" aria-labelledby="audience-heading">
        <div className="landing-section-intro">
          <span className="eyebrow">One platform, three perspectives</span>
          <h2 id="audience-heading">
            Built around the people who make a home decision.
          </h2>
        </div>
        <div className="audience-grid">
          {audiences.map((audience) => (
            <article className="audience-card" key={audience.eyebrow}>
              <span className="eyebrow">{audience.eyebrow}</span>
              <h3>{audience.title}</h3>
              <p>{audience.description}</p>
              <Link href={audience.href} className="text-button">
                {audience.action} <span>↗</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-features" aria-labelledby="features-heading">
        <div>
          <span className="eyebrow">What makes it clearer</span>
          <h2 id="features-heading">The details that change a decision.</h2>
        </div>
        <div className="feature-list">
          <div>
            <strong>01</strong>
            <span>
              <b>True monthly cost</b> See rent alongside the additional costs
              that shape your budget.
            </span>
          </div>
          <div>
            <strong>02</strong>
            <span>
              <b>Useful property intelligence</b> Understand water, network,
              verification and what still needs asking.
            </span>
          </div>
          <div>
            <strong>03</strong>
            <span>
              <b>A better working relationship</b> Give property professionals
              and house hunters a shared source of truth.
            </span>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <span className="eyebrow">Start with your perspective</span>
        <h2>
          Make a decision you can <em>live with.</em>
        </h2>
        <Link href="/auth" className="dark-button">
          Create your account <span>↗</span>
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
