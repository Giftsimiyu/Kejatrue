"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../backend/supabase/client";

type VisitSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
};

type PropertyVisitBookingProps = {
  propertyId: string;
  propertyTitle: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PropertyVisitBooking({
  propertyId,
  propertyTitle,
}: PropertyVisitBookingProps) {
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<VisitSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<VisitSlot | null>(null);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    async function loadSlots() {
      setLoadingSlots(true);
      setError("");

      const { data, error: slotsError } = await supabase
        .from("property_visit_slots")
        .select("id,starts_at,ends_at")
        .eq("property_id", propertyId)
        .eq("is_available", true)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });

      if (slotsError) {
        console.error("Failed to load visit slots:", slotsError);
        setError(`Unable to load available visits: ${slotsError.message}`);
        setSlots([]);
        setLoadingSlots(false);
        return;
      }

      const availableSlots = (data ?? []) as VisitSlot[];

      setSlots(availableSlots);

      if (availableSlots.length > 0) {
        const firstDate = new Date(availableSlots[0].starts_at)
          .toISOString()
          .slice(0, 10);

        setSelectedDate((current) => current || firstDate);
      } else {
        setSelectedDate("");
        setSelectedSlot(null);
      }

      setLoadingSlots(false);
    }

    loadSlots();
  }, [open, propertyId, supabase]);

  const dates = useMemo(() => {
    return Array.from(
      new Set(
        slots.map((slot) =>
          new Date(slot.starts_at).toISOString().slice(0, 10),
        ),
      ),
    );
  }, [slots]);

  const dateSlots = useMemo(() => {
    return slots.filter(
      (slot) =>
        new Date(slot.starts_at).toISOString().slice(0, 10) === selectedDate,
    );
  }, [slots, selectedDate]);

  async function bookVisit() {
    if (!selectedSlot) {
      setError("Select a visit time first.");
      return;
    }

    if (booking) {
      return;
    }

    setBooking(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Authentication error:", authError);

        setError("We could not verify your account. Please sign in again.");
        return;
      }

      if (!user) {
        window.location.href = `/auth?mode=sign-in&next=${encodeURIComponent(
          `/property/${propertyId}`,
        )}`;
        return;
      }

      console.log("Requesting property visit:", {
        propertyId,
        slotId: selectedSlot.id,
        userId: user.id,
      });

      const { data, error: bookingError } = await supabase.rpc(
        "request_property_visit",
        {
          p_slot_id: selectedSlot.id,
          p_notes: null,
        },
      );

      console.log("Property visit RPC response:", {
        data,
        error: bookingError,
      });

      if (bookingError) {
        console.error("Property visit request failed:", bookingError);

        if (
          bookingError.message
            ?.toLowerCase()
            .includes("already have an active visit request")
        ) {
          setError("You already have an active visit request for this visit.");
        } else if (
          bookingError.message?.toLowerCase().includes("no longer available")
        ) {
          setError(
            "That visit time is no longer available. Please choose another time.",
          );
        } else if (bookingError.code === "PGRST202") {
          setError(
            "The visit booking service is not available yet. Please refresh the page and try again.",
          );
        } else if (bookingError.code === "42501") {
          setError(
            "You do not currently have permission to request a visit. Please make sure you are signed in as a house hunter.",
          );
        } else {
          setError(bookingError.message);
        }

        return;
      }

      const bookedDate = formatDate(selectedSlot.starts_at);
      const bookedTime = formatTime(selectedSlot.starts_at);

      setMessage(`Visit request sent for ${bookedDate} at ${bookedTime}.`);

      setSlots((current) =>
        current.filter((slot) => slot.id !== selectedSlot.id),
      );

      setSelectedSlot(null);
    } catch (unexpectedError) {
      console.error("Unexpected property visit error:", unexpectedError);

      setError(
        "Something went wrong while requesting the visit. Please try again.",
      );
    } finally {
      setBooking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="property-primary-button property-full-button"
        onClick={() => {
          setOpen(true);
          setMessage("");
          setError("");
        }}
      >
        Book a visit
      </button>

      {open && (
        <div
          className="visit-booking-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !booking) {
              setOpen(false);
            }
          }}
        >
          <section className="visit-booking-modal">
            <button
              type="button"
              className="visit-booking-close"
              onClick={() => {
                if (!booking) {
                  setOpen(false);
                }
              }}
              aria-label="Close booking"
              disabled={booking}
            >
              ×
            </button>

            <span className="property-section-kicker">PROPERTY VISIT</span>

            <h2>Book a visit</h2>

            <p>
              Choose an available date and time for{" "}
              <strong>{propertyTitle}</strong>.
            </p>

            {message && (
              <div className="management-success-message">{message}</div>
            )}

            {error && <div className="management-error-message">{error}</div>}

            {loadingSlots ? (
              <div className="property-data-empty">
                <strong>Loading available visits...</strong>
                <p>Checking the latest viewing times for this property.</p>
              </div>
            ) : dates.length === 0 ? (
              <div className="property-data-empty">
                <strong>No visits are currently available.</strong>

                <p>
                  The listing contact has not published any available viewing
                  times yet.
                </p>
              </div>
            ) : (
              <>
                <label className="visit-booking-field">
                  <span>Choose a date</span>

                  <input
                    type="date"
                    value={selectedDate}
                    min={dates[0]}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setSelectedSlot(null);
                    }}
                  />
                </label>

                <div className="visit-booking-calendar">
                  {dates.map((date) => (
                    <button
                      type="button"
                      key={date}
                      className={
                        selectedDate === date
                          ? "visit-date-button is-active"
                          : "visit-date-button"
                      }
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedSlot(null);
                      }}
                      disabled={booking}
                    >
                      <strong>
                        {new Date(`${date}T00:00:00`).toLocaleDateString(
                          "en-KE",
                          {
                            weekday: "short",
                          },
                        )}
                      </strong>

                      <span>
                        {new Date(`${date}T00:00:00`).toLocaleDateString(
                          "en-KE",
                          {
                            day: "numeric",
                            month: "short",
                          },
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                {dateSlots.length > 0 ? (
                  <div className="visit-time-grid">
                    {dateSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot.id}
                        className={
                          selectedSlot?.id === slot.id
                            ? "visit-time-button is-active"
                            : "visit-time-button"
                        }
                        onClick={() => setSelectedSlot(slot)}
                        disabled={booking}
                      >
                        {formatTime(slot.starts_at)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="property-data-empty">
                    <strong>No times available on this date.</strong>
                    <p>Choose another date to see available viewing times.</p>
                  </div>
                )}

                <button
                  type="button"
                  className="property-primary-button property-full-button"
                  disabled={!selectedSlot || booking}
                  onClick={bookVisit}
                >
                  {booking ? "Sending request..." : "Request this visit"}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
