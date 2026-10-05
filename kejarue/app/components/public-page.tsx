import type { ReactNode } from "react";
import { SiteFooter, SiteNavbar } from "./site-chrome";

type PublicPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  contentClassName?: string;
};

export function PublicPage({
  eyebrow,
  title,
  intro,
  children,
  contentClassName = "public-page-content",
}: PublicPageProps) {
  return (
    <main className="public-page">
      <SiteNavbar backHref="/" backLabel="Back home" />
      <section className={contentClassName}>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="public-page-intro">{intro}</p>
        {children}
      </section>
      <SiteFooter />
    </main>
  );
}
