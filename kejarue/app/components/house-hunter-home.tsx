import Link from "next/link";
import { BrandLink, SiteFooter } from "./site-chrome";

type HouseHunterHomeProps = {
  userEmail?: string;
};

const navigation = [
  { label: "Home", href: "/" },
  { label: "Property listings", href: "/listings" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const tools = [
  {
    number: "01",
    title: "Budget calculator",
    description: "Work out the full monthly cost before you commit.",
    href: "/tools/budget",
  },
  {
    number: "02",
    title: "Bills calculator",
    description: "Estimate the everyday costs that listings leave out.",
    href: "/tools/bills",
  },
  {
    number: "03",
    title: "AI assistant",
    description: "Ask practical questions about your next move.",
    href: "/assistant",
  },
];

export default function HouseHunterHome({ userEmail }: HouseHunterHomeProps) {
  const initials = userEmail?.slice(0, 2).toUpperCase() || "HH";

  return (
    <main className="house-hunter-home">
      <aside className="house-hunter-sidebar">
        <BrandLink />
        <div className="house-hunter-user">
          <span className="avatar">{initials}</span>
          <div>
            <strong>House hunter</strong>
            <span>Explore with clarity</span>
          </div>
        </div>
        <nav
          className="house-hunter-side-nav"
          aria-label="House hunter navigation"
        >
          <Link href="/" className="active">
            <span>⌂</span> Home
          </Link>
          <Link href="/listings">
            <span>⌕</span> Property listings
          </Link>
          <Link href="/dashboard/favorites">
            <span>♡</span> Favorites
          </Link>
          <Link href="/dashboard/messages">
            <span>◷</span> Messages
          </Link>
        </nav>
        <div className="house-hunter-sidebar-note">
          <span className="eyebrow">Before you commit</span>
          <strong>See the whole story behind every home.</strong>
          <Link href="/tools/budget" className="text-button">
            Check your budget <span>↗</span>
          </Link>
        </div>
      </aside>

      <section className="house-hunter-workspace">
        <header className="house-hunter-topbar">
          <nav aria-label="House hunter pages">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.href === "/" ? "active" : ""}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="house-hunter-account">
            <span>{userEmail || "Your account"}</span>
            <span className="avatar small">{initials}</span>
          </div>
        </header>

        <div className="house-hunter-content">
          <section className="house-hunter-hero">
            <div className="house-hunter-hero-copy">
              <span className="eyebrow">Your house-hunter home</span>
              <h1>
                Find a home with the <em>full story.</em>
              </h1>
              <p>
                Start with what matters to you. Compare real monthly costs,
                utilities and lived details before you commit.
              </p>
              <Link href="/listings" className="dark-button">
                Explore property listings <span>↗</span>
              </Link>
            </div>
            <div className="house-hunter-hero-art" aria-hidden="true">
              <div className="hero-art-window" />
              <div className="hero-art-house">
                <span />
                <span />
                <span />
              </div>
              <div className="hero-art-path" />
            </div>
          </section>

          <section className="house-hunter-search" aria-label="Search homes">
            <span className="search-icon">⌕</span>
            <span>Search by location, neighbourhood or property name</span>
            <Link href="/listings" className="dark-button">
              Search homes <span>↗</span>
            </Link>
          </section>

          <section className="house-hunter-section">
            <div className="house-hunter-section-heading">
              <div>
                <span className="eyebrow">Start exploring</span>
                <h2>Everything you need for a clearer move.</h2>
              </div>
              <Link href="/listings" className="text-button">
                View all homes <span>↗</span>
              </Link>
            </div>
            <div className="house-hunter-tools">
              {tools.map((tool) => (
                <Link
                  href={tool.href}
                  className="house-hunter-tool"
                  key={tool.number}
                >
                  <span className="tool-number">{tool.number}</span>
                  <h3>{tool.title}</h3>
                  <p>{tool.description}</p>
                  <span className="tool-arrow">↗</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="house-hunter-principle">
            <span className="house-hunter-principle-mark">K</span>
            <div>
              <span className="eyebrow">The KejaTrue principle</span>
              <h2>Good listings answer questions before they are asked.</h2>
              <p>
                Costs, utilities, verification and lived experience belong in
                the same conversation.
              </p>
            </div>
            <Link href="/about" className="dark-button">
              How it works <span>↗</span>
            </Link>
          </section>
        </div>
        <SiteFooter />
      </section>
    </main>
  );
}
