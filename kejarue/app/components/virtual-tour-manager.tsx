"use client";

import { useMemo, useState } from "react";
import { createClient } from "../backend/supabase/client";

type VirtualTour = {
  id: string;
  property_id: string;
  panorama_url: string;
  room_name: string | null;
  created_at: string;
};

type VirtualTourManagerProps = {
  propertyId: string;
  initialTours: VirtualTour[];
};

export default function VirtualTourManager({
  propertyId,
  initialTours,
}: VirtualTourManagerProps) {
  const supabase = useMemo(() => createClient(), []);

  const [tours, setTours] = useState<VirtualTour[]>(initialTours);
  const [roomName, setRoomName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function uploadTour(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");
    setErrorMessage("");

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setErrorMessage("The panorama must be smaller than 30 MB.");
      event.target.value = "";
      return;
    }

    if (!roomName.trim()) {
      setErrorMessage(
        "Enter a room name first, for example Living Room or Master Bedroom.",
      );
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be signed in to upload a virtual tour.");
      }

      /*
       * We use a unique folder for every uploaded panorama.
       *
       * Example:
       * virtual-tours/
       *   user-id/
       *     property-id/
       *       uuid.jpg
       */
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

      const fileName = `${crypto.randomUUID()}.${extension}`;

      const storagePath = `virtual-tours/${user.id}/${propertyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("property-images").getPublicUrl(storagePath);

      const { data: tour, error: tourError } = await supabase
        .from("virtual_tours")
        .insert({
          property_id: propertyId,
          panorama_url: publicUrl,
          room_name: roomName.trim(),
        })
        .select("id,property_id,panorama_url,room_name,created_at")
        .single();

      if (tourError) {
        /*
         * If the database insert fails, remove the uploaded file
         * so we do not leave an orphaned image in storage.
         */
        await supabase.storage.from("property-images").remove([storagePath]);

        throw tourError;
      }

      setTours((current) => [...current, tour as VirtualTour]);

      setRoomName("");

      setMessage(`${roomName.trim()} virtual tour uploaded successfully.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Virtual tour upload failed.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function deleteTour(tour: VirtualTour) {
    if (
      !window.confirm(`Delete the "${tour.room_name || "this"}" virtual tour?`)
    ) {
      return;
    }

    setDeletingId(tour.id);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("virtual_tours")
        .delete()
        .eq("id", tour.id)
        .eq("property_id", propertyId);

      if (error) {
        throw error;
      }

      setTours((current) => current.filter((item) => item.id !== tour.id));

      setMessage("Virtual tour removed.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not delete the virtual tour.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="management-card">
      <div className="management-card-heading">
        <div>
          <span className="eyebrow">05 · Immersive media</span>

          <h2>360° virtual tours</h2>
        </div>

        <strong>
          {tours.length} room{tours.length === 1 ? "" : "s"}
        </strong>
      </div>

      <p className="management-card-intro">
        Upload 360° panoramic images to let house hunters look around the actual
        property before visiting.
      </p>

      <div className="virtual-tour-upload-panel">
        <div className="virtual-tour-upload-info">
          <strong>Upload a 360° panorama</strong>

          <p>
            For the best result, use an equirectangular panorama with a 2:1
            aspect ratio, such as 6000 × 3000 pixels.
          </p>
        </div>

        <div className="virtual-tour-upload-controls">
          <label className="management-field">
            <span>Room / space name</span>

            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="e.g. Living Room"
              disabled={uploading}
            />
          </label>

          <label className="secondary-button virtual-tour-upload-button">
            {uploading ? "Uploading…" : "Choose 360° image"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadTour}
              disabled={uploading}
              hidden
            />
          </label>
        </div>

        <div className="virtual-tour-room-examples">
          <span>Suggested names:</span>

          <button type="button" onClick={() => setRoomName("Living Room")}>
            Living Room
          </button>

          <button type="button" onClick={() => setRoomName("Kitchen")}>
            Kitchen
          </button>

          <button type="button" onClick={() => setRoomName("Master Bedroom")}>
            Master Bedroom
          </button>

          <button type="button" onClick={() => setRoomName("Bathroom")}>
            Bathroom
          </button>

          <button type="button" onClick={() => setRoomName("Balcony")}>
            Balcony
          </button>
        </div>
      </div>

      {message && <div className="management-success-message">{message}</div>}

      {errorMessage && (
        <div className="management-error-message">{errorMessage}</div>
      )}

      {tours.length > 0 ? (
        <div className="virtual-tour-list">
          {tours.map((tour) => (
            <article className="virtual-tour-management-card" key={tour.id}>
              <div className="virtual-tour-preview">
                <img
                  src={tour.panorama_url}
                  alt={`${tour.room_name || "Room"} 360° panorama`}
                />

                <span className="virtual-tour-badge">360° TOUR</span>
              </div>

              <div className="virtual-tour-management-content">
                <div>
                  <span className="eyebrow">Virtual tour</span>

                  <h3>{tour.room_name || "Unnamed room"}</h3>

                  <p>
                    House hunters can explore this space interactively from the
                    public property page.
                  </p>
                </div>

                <div className="virtual-tour-management-actions">
                  <a
                    href={tour.panorama_url}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                  >
                    View image
                  </a>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => deleteTour(tour)}
                    disabled={deletingId === tour.id}
                  >
                    {deletingId === tour.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="management-empty-media virtual-tour-empty">
          <strong>No virtual tours yet.</strong>

          <span>
            Upload a 360° panorama for each room or space you want house hunters
            to explore.
          </span>
        </div>
      )}
    </section>
  );
}
