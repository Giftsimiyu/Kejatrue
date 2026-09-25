import Link from "next/link";
import type { ReactNode } from "react";

type SiteNavbarProps = {
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
};

export function BrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link href="/" className="brand-lockup">
      <span className="brand-mark">K</span>
      <span>KejaTrue</span>
    </Link>
  );
}

export function SiteNavbar({ backHref, backLabel, children }: SiteNavbarProps) {
  return (
    <header className="site-navbar">
      <BrandLink />
      {children ||
        (backHref && backLabel ? (
          <Link href={backHref} className="text-button">
            {backLabel} <span>↗</span>
          </Link>
        ) : null)}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <BrandLink />
      <span>Property intelligence for Kenya</span>
      <span>© 2026 KejaTrue</span>
    </footer>
  );
}
