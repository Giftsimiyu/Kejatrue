"use client";

import { useEffect, useRef, useState } from "react";

type VirtualTour = {
  id: string;
  panorama_url: string;
  room_name: string | null;
};

type VirtualTourViewerProps = {
  tours: VirtualTour[];
};

export default function VirtualTourViewer({ tours }: VirtualTourViewerProps) {
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);

  const [selectedTourId, setSelectedTourId] = useState(tours[0]?.id ?? "");

  const selectedTour =
    tours.find((tour) => tour.id === selectedTourId) ?? tours[0] ?? null;

  useEffect(() => {
    let mounted = true;

    async function createViewer() {
      if (!viewerContainerRef.current || !selectedTour) {
        return;
      }

      const { Viewer } = await import("@photo-sphere-viewer/core");

      if (!mounted || !viewerContainerRef.current) {
        return;
      }

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          // Ignore viewer cleanup errors.
        }

        viewerRef.current = null;
      }

      viewerContainerRef.current.innerHTML = "";

      viewerRef.current = new Viewer({
        container: viewerContainerRef.current,
        panorama: selectedTour.panorama_url,
        navbar: ["zoom", "move", "fullscreen"],
        defaultZoomLvl: 0,
        touchmoveTwoFingers: false,
        mousemove: true,
      });
    }

    createViewer();

    return () => {
      mounted = false;

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          // Ignore cleanup errors.
        }

        viewerRef.current = null;
      }
    };
  }, [selectedTour]);

  if (!tours.length) {
    return null;
  }

  return (
    <section className="property-card virtual-tour-section">
      <div className="property-section-heading">
        <div>
          <span className="property-section-kicker">Explore the space</span>

          <h2>360° virtual tour</h2>
        </div>

        <span className="virtual-tour-badge">Interactive</span>
      </div>

      <p className="virtual-tour-intro">
        Look around the property from your screen. Drag to change direction,
        zoom in to inspect details, or switch between available rooms.
      </p>

      {tours.length > 1 && (
        <div className="virtual-tour-room-selector">
          {tours.map((tour) => (
            <button
              key={tour.id}
              type="button"
              className={
                selectedTourId === tour.id
                  ? "virtual-tour-room-button is-active"
                  : "virtual-tour-room-button"
              }
              onClick={() => setSelectedTourId(tour.id)}
            >
              {tour.room_name || "Room"}
            </button>
          ))}
        </div>
      )}

      <div ref={viewerContainerRef} className="virtual-tour-viewer" />

      <div className="virtual-tour-help">
        <span>↔ Drag</span>
        <span>＋ / − Zoom</span>
        <span>□ Fullscreen</span>
      </div>
    </section>
  );
}
