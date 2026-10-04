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
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    async function loadSlots() {
      setLoading(true);
      setError("");

      const { data, error: slotsError } = await supabase
        .from("property_visit_slots")
        .select("id,starts_at,ends_at")
        .eq("property_id", propertyId)
        .eq("is_available", true)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });

      if (slotsError) {
        setError(slotsError.message);
      } else {
        setSlots((data ?? []) as VisitSlot[]);

        if (data?.length) {
          setSelectedDate(
            new Date(data[0].starts_at).toISOString().slice(0, 10),
          );
        }
      }

      setLoading(false);
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

  const dateSlots = slots.filter(
    (slot) =>
      new Date(slot.starts_at).toISOString().slice(0, 10) === selectedDate,
  );

  async function bookVisit() {
    if (!selectedSlot) {
      setError("Select a visit time first.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = `/auth?mode=sign-in&next=${encodeURIComponent(
        `/property/${propertyId}`,
      )}`;
      return;
    }

    setBooking(true);
    setError("");
    setMessage("");

    const { data: property } = await supabase
      .from("properties")
      .select("owner_id,agent_id")
      .eq("id", propertyId)
      .maybeSingle();

    if (!property) {
      setError("This property is no longer available.");
      setBooking(false);
      return;
    }

    let hostUserId = property.owner_id;

    if (property.agent_id) {
      const { data: agent } = await supabase
        .from("agents")
        .select("user_id")
        .eq("id", property.agent_id)
        .maybeSingle();

      if (agent?.user_id) {
        hostUserId = agent.user_id;
      }
    }

    const { error: bookingError } = await supabase
      .from("property_visit_requests")
      .insert({
        property_id: propertyId,
        slot_id: selectedSlot.id,
        house_hunter_id: user.id,
        host_user_id: hostUserId,
        status: "requested",
      });

    if (bookingError) {
      setError(
        bookingError.code === "23505"
          ? "That visit slot has just been booked. Please choose another."
          : bookingError.message,
      );
      setBooking(false);
      return;
    }

    await supabase
      .from("property_visit_slots")
      .update({ is_available: false })
      .eq("id", selectedSlot.id);

    setMessage(
      `Visit request sent for ${formatDate(
        selectedSlot.starts_at,
      )} at ${formatTime(selectedSlot.starts_at)}.`,
    );

    setSlots((current) =>
      current.filter((slot) => slot.id !== selectedSlot.id),
    );

    setSelectedSlot(null);
    setBooking(false);
  }

  return (
    <>
      <button
        type="button"
        className="property-primary-button property-full-button"
        onClick={() => setOpen(true)}
      >
        Book a visit
      </button>

      {open && (
        <div
          className="visit-booking-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section className="visit-booking-modal">
            <button
              type="button"
              className="visit-booking-close"
              onClick={() => setOpen(false)}
              aria-label="Close booking"
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

            {loading ? (
              <p>Loading available visits...</p>
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
                    >
                      <strong>
                        {new Date(`${date}T00:00:00`).toLocaleDateString(
                          "en-KE",
                          { weekday: "short" },
                        )}
                      </strong>

                      <span>
                        {new Date(`${date}T00:00:00`).toLocaleDateString(
                          "en-KE",
                          { day: "numeric", month: "short" },
                        )}
                      </span>
                    </button>
                  ))}
                </div>

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
                    >
                      {formatTime(slot.starts_at)}
                    </button>
                  ))}
                </div>

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
