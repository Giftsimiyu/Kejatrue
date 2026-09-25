import type { ReactNode } from "react";
import { SiteFooter, SiteNavbar } from "./site-chrome";

type PublicPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export function PublicPage({
  eyebrow,
  title,
  intro,
  children,
}: PublicPageProps) {
  return (
    <main className="public-page">
      <SiteNavbar backHref="/" backLabel="Back home" />
      <section className="public-page-content">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="public-page-intro">{intro}</p>
        {children}
      </section>
      <SiteFooter />
    </main>
  );
}
