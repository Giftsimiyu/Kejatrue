"use client";

import { useState } from "react";

type StagingImage = {
  id: string;
  original_image: string;
  generated_image: string | null;
  design_style: string;
  status: string;
};

type AIVirtualStagingProps = {
  propertyId: string;
  images: string[];
  existingRedesigns?: StagingImage[];
};

const DESIGN_STYLES = [
  {
    id: "modern",
    label: "Modern",
    description: "Clean lines and contemporary furniture",
  },
  {
    id: "minimalist",
    label: "Minimalist",
    description: "Simple, uncluttered and functional",
  },
  {
    id: "scandinavian",
    label: "Scandinavian",
    description: "Bright, warm and natural",
  },
  {
    id: "bohemian",
    label: "Bohemian",
    description: "Layered textures and expressive decor",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Elegant furniture and premium finishes",
  },
  {
    id: "warm-cozy",
    label: "Warm & Cozy",
    description: "Soft lighting and comfortable interiors",
  },
  {
    id: "contemporary",
    label: "Contemporary",
    description: "Current, refined interior design",
  },
  {
    id: "industrial",
    label: "Industrial",
    description: "Raw materials and urban character",
  },
];

export default function AIVirtualStaging({
  propertyId,
  images,
  existingRedesigns = [],
}: AIVirtualStagingProps) {
  const [selectedImage, setSelectedImage] = useState(images[0] ?? "");

  const [selectedStyle, setSelectedStyle] = useState("modern");

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateDesign() {
    if (!selectedImage) {
      setError("Select a property photo first.");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedImage(null);

    try {
      const response = await fetch("/api/ai/redesign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          imageUrl: selectedImage,
          designStyle: selectedStyle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not generate the redesign.");
      }

      setGeneratedImage(data.generatedImage);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the design.",
      );
    } finally {
      setLoading(false);
    }
  }

  const previousDesigns = existingRedesigns.filter(
    (item) => item.generated_image && item.original_image === selectedImage,
  );

  return (
    <section className="property-card ai-staging-section">
      <div className="property-section-heading">
        <div>
          <span className="property-section-kicker">Visualise your space</span>

          <h2>AI virtual staging</h2>
        </div>

        <span className="ai-staging-badge">AI powered</span>
      </div>

      <p className="ai-staging-intro">
        Wondering what this space could look like furnished? Choose an interior
        style and KejaTrue will redesign the selected room while keeping the
        room's structure and proportions.
      </p>

      {images.length > 0 && (
        <>
          <div className="ai-staging-label">1. Choose a property photo</div>

          <div className="ai-staging-image-selector">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className={
                  selectedImage === image
                    ? "ai-staging-image-option is-active"
                    : "ai-staging-image-option"
                }
                onClick={() => {
                  setSelectedImage(image);
                  setGeneratedImage(null);
                }}
              >
                <img src={image} alt={`Property room ${index + 1}`} />
              </button>
            ))}
          </div>

          <div className="ai-staging-label">2. Choose an interior style</div>

          <div className="ai-staging-style-grid">
            {DESIGN_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                className={
                  selectedStyle === style.id
                    ? "ai-staging-style-option is-active"
                    : "ai-staging-style-option"
                }
                onClick={() => setSelectedStyle(style.id)}
              >
                <strong>{style.label}</strong>
                <span>{style.description}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="property-primary-button ai-staging-generate"
            onClick={generateDesign}
            disabled={loading}
          >
            {loading ? "Creating your design..." : "✨ Visualise this style"}
          </button>

          {error && <div className="ai-staging-error">{error}</div>}

          {generatedImage && (
            <div className="ai-staging-result">
              <div className="ai-staging-result-heading">
                <div>
                  <span className="property-section-kicker">
                    Your visualisation
                  </span>

                  <h3>
                    {DESIGN_STYLES.find((style) => style.id === selectedStyle)
                      ?.label ?? "Redesigned room"}
                  </h3>
                </div>

                <span>AI generated</span>
              </div>

              <div className="ai-staging-before-after">
                <div>
                  <small>Original</small>

                  <img src={selectedImage} alt="Original property" />
                </div>

                <div>
                  <small>Visualised</small>

                  <img src={generatedImage} alt="AI redesigned property" />
                </div>
              </div>

              <p className="ai-staging-disclaimer">
                This is an AI visualisation, not a photograph of the actual
                furnished property. Room structure and dimensions may not be
                perfectly represented.
              </p>
            </div>
          )}

          {previousDesigns.length > 0 && (
            <div className="ai-staging-history">
              <div className="ai-staging-label">Previous visualisations</div>

              <div className="ai-staging-history-grid">
                {previousDesigns.map((design) => (
                  <button
                    type="button"
                    key={design.id}
                    onClick={() => setGeneratedImage(design.generated_image)}
                  >
                    <img
                      src={design.generated_image!}
                      alt={`${design.design_style} visualisation`}
                    />

                    <span>{design.design_style}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
