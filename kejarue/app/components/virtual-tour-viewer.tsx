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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const rotateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedId, setSelectedId] = useState(tours[0]?.id ?? "");
  const [zoom, setZoom] = useState(50);
  const [autoTour, setAutoTour] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const selected =
    tours.find((tour) => tour.id === selectedId) ?? tours[0] ?? null;

  useEffect(() => {
    if (!tours.some((tour) => tour.id === selectedId)) {
      setSelectedId(tours[0]?.id ?? "");
    }
  }, [tours, selectedId]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!containerRef.current || !selected) return;

      const { Viewer } = await import("@photo-sphere-viewer/core");

      if (!mounted || !containerRef.current) return;

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {}
      }

      containerRef.current.innerHTML = "";

      const viewer = new Viewer({
        container: containerRef.current,
        panorama: selected.panorama_url,
        navbar: ["zoom", "move", "caption", "fullscreen"],
        caption: selected.room_name || "360° Virtual Tour",
        defaultZoomLvl: 50,
        minFov: 30,
        maxFov: 90,
        mousemove: true,
        mousewheel: true,
        keyboard: "fullscreen",
        touchmoveTwoFingers: false,
        defaultTransition: {
          rotation: false,
          effect: "fade",
          speed: 900,
        },
      });

      viewerRef.current = viewer;

      viewer.addEventListener("zoom-updated", () => {
        if (mounted) {
          setZoom(Math.round(viewer.getZoomLevel()));
        }
      });

      viewer.addEventListener("fullscreen", (event: any) => {
        if (mounted) {
          setFullscreen(Boolean(event.fullscreen));
        }
      });

      setZoom(50);
    }

    init();

    return () => {
      mounted = false;

      if (rotateTimer.current) {
        clearInterval(rotateTimer.current);
        rotateTimer.current = null;
      }

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {}

        viewerRef.current = null;
      }
    };
  }, [selected]);

  useEffect(() => {
    if (rotateTimer.current) {
      clearInterval(rotateTimer.current);
      rotateTimer.current = null;
    }

    if (!autoTour || !viewerRef.current) return;

    rotateTimer.current = setInterval(() => {
      const viewer = viewerRef.current;

      if (!viewer) return;

      const position = viewer.getPosition();

      viewer.animate({
        yaw: Number(position.yaw) + Math.PI / 2,
        pitch: position.pitch,
        zoom: viewer.getZoomLevel(),
        speed: 7000,
      });
    }, 6800);

    return () => {
      if (rotateTimer.current) {
        clearInterval(rotateTimer.current);
        rotateTimer.current = null;
      }
    };
  }, [autoTour]);

  if (!tours.length) return null;

  function zoomIn() {
    viewerRef.current?.zoomIn(10);
  }

  function zoomOut() {
    viewerRef.current?.zoomOut(10);
  }

  function resetView() {
    viewerRef.current?.rotate({
      yaw: 0,
      pitch: 0,
    });

    viewerRef.current?.zoom(50);

    setZoom(50);
  }

  function toggleFullscreen() {
    viewerRef.current?.toggleFullscreen();
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

      <div className="virtual-tour-zillow-layout">
        <aside className="virtual-tour-room-panel">
          <div className="virtual-tour-room-panel-heading">
            <span>TOUR ROOMS</span>
            <strong>{tours.length}</strong>
          </div>

          <div className="virtual-tour-room-list">
            {tours.map((tour) => (
              <button
                key={tour.id}
                type="button"
                className={
                  selectedId === tour.id
                    ? "virtual-tour-room-item is-active"
                    : "virtual-tour-room-item"
                }
                onClick={() => {
                  setAutoTour(false);
                  setSelectedId(tour.id);
                }}
              >
                <span className="virtual-tour-room-thumb">
                  <img src={tour.panorama_url} alt="" />
                </span>

                <span>
                  <strong>{tour.room_name || "Room"}</strong>

                  <small>360° view</small>
                </span>

                <b>›</b>
              </button>
            ))}
          </div>

          <div className="virtual-tour-room-tip">
            <strong>Explore this home</strong>

            <span>Drag to look around · Scroll to zoom</span>
          </div>
        </aside>

        <div className="virtual-tour-stage">
          <div className="virtual-tour-stage-topbar">
            <div>
              <span>NOW VIEWING</span>

              <strong>{selected?.room_name || "Property space"}</strong>
            </div>

            <div className="virtual-tour-stage-actions">
              <button
                type="button"
                className={autoTour ? "is-active" : ""}
                onClick={() => setAutoTour((value) => !value)}
              >
                {autoTour ? "⏸ Auto tour" : "▶ Auto tour"}
              </button>

              <button type="button" onClick={resetView}>
                ↺ Reset
              </button>

              <button type="button" onClick={toggleFullscreen}>
                {fullscreen ? "⤢ Exit" : "⛶ Fullscreen"}
              </button>
            </div>
          </div>

          <div className="virtual-tour-viewer-shell">
            <div ref={containerRef} className="virtual-tour-viewer" />

            <div className="virtual-tour-floating-controls">
              <button type="button" onClick={zoomOut} aria-label="Zoom out">
                −
              </button>

              <div className="virtual-tour-zoom-readout">
                <span>ZOOM</span>
                <strong>{zoom}%</strong>
              </div>

              <button type="button" onClick={zoomIn} aria-label="Zoom in">
                +
              </button>
            </div>

            <div className="virtual-tour-center-hint">
              <span>360°</span>
              <strong>Drag to explore</strong>
            </div>
          </div>

          <div className="virtual-tour-bottom-bar">
            <span>↔ Drag</span>
            <span>⌕ Scroll to zoom</span>
            <span>⛶ Fullscreen</span>
            <span>⌨ Keyboard</span>
          </div>
        </div>
      </div>
    </section>
  );
}
