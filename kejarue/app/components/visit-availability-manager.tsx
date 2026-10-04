"use client";

import { useMemo, useState } from "react";
import { createClient } from "../backend/supabase/client";

type VisitSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  is_available: boolean;
};

export default function VisitAvailabilityManager({
  propertyId,
  initialSlots,
}: {
  propertyId: string;
  initialSlots: VisitSlot[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [slots, setSlots] = useState(initialSlots);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function addSlot() {
    if (!date || !startTime || !endTime) {
      setError("Choose a date, start time and end time.");
      return;
    }

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session has expired.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { data, error: insertError } = await supabase
      .from("property_visit_slots")
      .insert({
        property_id: propertyId,
        host_user_id: user.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        is_available: true,
      })
      .select("id,starts_at,ends_at,is_available")
      .single();

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "A visit slot already exists at that time."
          : insertError.message,
      );
      setSaving(false);
      return;
    }

    setSlots((current) =>
      [...current, data as VisitSlot].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    );

    setMessage("Visit time added.");
    setSaving(false);
  }

  async function removeSlot(id: string) {
    const { error: deleteError } = await supabase
      .from("property_visit_slots")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSlots((current) => current.filter((slot) => slot.id !== id));
  }

  return (
    <section className="management-card">
      <div className="management-card-heading">
        <div>
          <span className="eyebrow">06 · Property visits</span>
          <h2>Viewing availability</h2>
        </div>
      </div>

      <p className="management-card-intro">
        Publish the exact dates and times when house hunters can request
        physical visits.
      </p>

      {message && <div className="management-success-message">{message}</div>}

      {error && <div className="management-error-message">{error}</div>}

      <div className="visit-availability-form">
        <label className="management-field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <label className="management-field">
          <span>Start</span>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>

        <label className="management-field">
          <span>End</span>
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </label>

        <button
          type="button"
          className="primary-button"
          disabled={saving}
          onClick={addSlot}
        >
          {saving ? "Adding..." : "Add viewing time"}
        </button>
      </div>

      <div className="visit-availability-list">
        {slots.length === 0 ? (
          <div className="management-empty-media">
            <strong>No viewing times yet.</strong>
            <span>Add dates so house hunters can book physical visits.</span>
          </div>
        ) : (
          slots.map((slot) => (
            <div className="visit-availability-row" key={slot.id}>
              <div>
                <strong>
                  {new Date(slot.starts_at).toLocaleDateString("en-KE", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>

                <span>
                  {new Date(slot.starts_at).toLocaleTimeString("en-KE", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(slot.ends_at).toLocaleTimeString("en-KE", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <button
                type="button"
                className="danger-button"
                onClick={() => removeSlot(slot.id)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
