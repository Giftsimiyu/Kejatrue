import { PublicPage } from "../components/public-page";

export default function AboutPage() {
  return (
    <PublicPage
      eyebrow="About KejaTrue"
      title="A fuller picture before you choose a home."
      intro="KejaTrue brings price, utilities, verification and lived experience into one clearer property decision."
    >
      <div className="public-page-grid">
        <article>
          <span className="eyebrow">Our principle</span>
          <h2>Good listings answer questions before they are asked.</h2>
          <p>
            We help house hunters understand what a property will really ask of
            their budget and daily life.
          </p>
        </article>
        <article>
          <span className="eyebrow">Built for people</span>
          <h2>Useful information should feel human.</h2>
          <p>
            Agents and landlords get better tools to share accurate details,
            while renters get more confidence before they commit.
          </p>
        </article>
      </div>
    </PublicPage>
  );
}
