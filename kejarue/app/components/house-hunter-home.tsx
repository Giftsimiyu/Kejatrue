import Link from "next/link";
import {
  HiArrowUpRight,
  HiBuildingOffice2,
  HiHome,
  HiMagnifyingGlass,
  HiOutlineHeart,
  HiOutlineSparkles,
  HiUser,
} from "react-icons/hi2";
import { BrandLink, SiteFooter } from "./site-chrome";

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

export default function HouseHunterHome() {
  return (
    <main className="house-hunter-home">
      <aside className="house-hunter-sidebar">
        <BrandLink />
        <nav
          className="house-hunter-side-nav"
          aria-label="House hunter navigation"
        >
          <Link href="/" className="active">
            <HiHome aria-hidden="true" /> Home
          </Link>
          <Link href="/listings">
            <HiMagnifyingGlass aria-hidden="true" /> Property listings
          </Link>
          <Link href="/dashboard/favorites">
            <HiOutlineHeart aria-hidden="true" /> Favorites
          </Link>
          <Link href="/dashboard/messages">
            <HiBuildingOffice2 aria-hidden="true" /> Messages
          </Link>
          <Link href="/dashboard/profile">
            <HiUser aria-hidden="true" /> Profile
          </Link>
        </nav>
        <div className="house-hunter-sidebar-note">
          <span className="eyebrow">Before you commit</span>
          <strong>See the whole story behind every home.</strong>
          <Link href="/tools/budget" className="text-button">
            Check your budget <HiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </aside>

      <section className="house-hunter-workspace">
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
                Explore property listings <HiArrowUpRight aria-hidden="true" />
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
            <span className="search-icon" aria-hidden="true">
              <HiMagnifyingGlass />
            </span>
            <span>Search by location, neighbourhood or property name</span>
            <Link href="/listings" className="dark-button">
              Search homes <HiArrowUpRight aria-hidden="true" />
            </Link>
          </section>

          <section className="house-hunter-section">
            <div className="house-hunter-section-heading">
              <div>
                <span className="eyebrow">Start exploring</span>
                <h2>Everything you need for a clearer move.</h2>
              </div>
              <Link href="/listings" className="text-button">
                View all homes <HiArrowUpRight aria-hidden="true" />
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
                  <span className="tool-arrow" aria-hidden="true">
                    <HiArrowUpRight />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="house-hunter-principle">
            <span className="house-hunter-principle-mark" aria-hidden="true">
              <HiOutlineSparkles />
            </span>
            <div>
              <span className="eyebrow">The KejaTrue principle</span>
              <h2>Good listings answer questions before they are asked.</h2>
              <p>
                Costs, utilities, verification and lived experience belong in
                the same conversation.
              </p>
            </div>
            <Link href="/about" className="dark-button">
              How it works <HiArrowUpRight aria-hidden="true" />
            </Link>
          </section>
        </div>
        <SiteFooter />
      </section>
    </main>
  );
}
