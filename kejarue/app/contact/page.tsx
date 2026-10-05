import Link from "next/link";
import { HiArrowUpRight } from "react-icons/hi2";
import { PublicPage } from "../components/public-page";

export default function ContactPage() {
  return (
    <PublicPage
      eyebrow="Contact"
      title="Let’s make the next move clearer."
      intro="Have a question about a property, your account or bringing better information to your listings?"
    >
      <div className="contact-panel">
        <span className="eyebrow">Start a conversation</span>
        <h2>We are here to help.</h2>
        <p>
          Send us a note and our team will get back to you with the next useful
          step.
        </p>
        <Link href="mailto:hello@kejatrue.com" className="dark-button">
          Email KejaTrue <HiArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </PublicPage>
  );
}
