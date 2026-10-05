"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiCheckCircle } from "react-icons/hi2";
import { createClient } from "../../backend/supabase/client";
import { SiteNavbar } from "../../components/site-chrome";
import DashboardAccountActions from "../../components/dashboard-account-actions";

type VisitRequest = {
  id: string;
  property_id: string;
  slot_id: string;
  house_hunter_id: string;
  host_user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  starts_at: string;
  ends_at: string;
  property_title: string;
  property_location: string;
  house_hunter_name: string;
  house_hunter_email: string;
  house_hunter_phone: string | null;
};

export default function VisitRequestsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadRequests() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || !["agent", "landlord"].includes(profile.role)) {
        router.push("/dashboard");
        return;
      }

      const { data: requestData, error: requestError } = await supabase
        .from("property_visit_requests")
        .select(
          `
            id,
            property_id,
            slot_id,
            house_hunter_id,
            host_user_id,
            status,
            message,
            created_at,
            updated_at
          `,
        )
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false });

      if (requestError) {
        throw requestError;
      }

      if (!requestData || requestData.length === 0) {
        setRequests([]);
        return;
      }

      const propertyIds = [
        ...new Set(requestData.map((item) => item.property_id)),
      ];

      const slotIds = [...new Set(requestData.map((item) => item.slot_id))];

      const houseHunterIds = [
        ...new Set(requestData.map((item) => item.house_hunter_id)),
      ];

      const [
        { data: properties, error: propertiesError },
        { data: slots, error: slotsError },
        { data: houseHunters, error: usersError },
      ] = await Promise.all([
        supabase
          .from("properties")
          .select("id, title, location, city")
          .in("id", propertyIds),

        supabase
          .from("property_visit_slots")
          .select("id, starts_at, ends_at")
          .in("id", slotIds),

        supabase
          .from("users")
          .select("id, full_name, email, phone")
          .in("id", houseHunterIds),
      ]);

      if (propertiesError) throw propertiesError;
      if (slotsError) throw slotsError;
      if (usersError) throw usersError;

      const propertyMap = new Map(
        (properties ?? []).map((property) => [property.id, property]),
      );

      const slotMap = new Map((slots ?? []).map((slot) => [slot.id, slot]));

      const userMap = new Map(
        (houseHunters ?? []).map((person) => [person.id, person]),
      );

      const combined: VisitRequest[] = requestData.map((request) => {
        const property = propertyMap.get(request.property_id);
        const slot = slotMap.get(request.slot_id);
        const houseHunter = userMap.get(request.house_hunter_id);

        return {
          ...request,
          starts_at: slot?.starts_at ?? "",
          ends_at: slot?.ends_at ?? "",
          property_title: property?.title ?? "Property",
          property_location:
            property?.location || property?.city || "Location unavailable",
          house_hunter_name: houseHunter?.full_name || "House Hunter",
          house_hunter_email: houseHunter?.email || "Email unavailable",
          house_hunter_phone: houseHunter?.phone ?? null,
        };
      });

      setRequests(combined);
    } catch (error) {
      console.error("Failed to load visit requests:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load visit requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleDecision(
    requestId: string,
    action: "confirm_property_visit" | "decline_property_visit",
  ) {
    setProcessingId(requestId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.rpc(action, {
        p_request_id: requestId,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        action === "confirm_property_visit"
          ? "Visit confirmed successfully."
          : "Visit request declined.",
      );

      await loadRequests();
    } catch (error) {
      console.error("Visit decision failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update the visit request.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  function formatDate(date: string) {
    if (!date) return "Date unavailable";

    return new Intl.DateTimeFormat("en-KE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  }

  function formatTime(date: string) {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-KE", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function statusLabel(status: string) {
    switch (status) {
      case "requested":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "declined":
        return "Declined";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  }

  function statusClass(status: string) {
    switch (status) {
      case "requested":
        return "visit-status pending";
      case "confirmed":
        return "visit-status confirmed";
      case "declined":
        return "visit-status declined";
      case "cancelled":
        return "visit-status cancelled";
      default:
        return "visit-status";
    }
  }

  return (
    <main className="dashboard-page">
      <SiteNavbar>
        <DashboardAccountActions />
      </SiteNavbar>
      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">Property workspace</span>

            <h1>Viewing requests</h1>

            <p>Manage house-hunter requests to visit your properties.</p>
          </div>

          <Link href="/dashboard" className="text-button">
            Back to dashboard
          </Link>
        </div>

        {successMessage && (
          <div className="dashboard-success">{successMessage}</div>
        )}

        {errorMessage && <div className="dashboard-error">{errorMessage}</div>}

        {loading ? (
          <div className="dashboard-empty">
            <strong>Loading viewing requests...</strong>
            <p>Please wait.</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="dashboard-empty">
            <span className="eyebrow">No requests yet</span>

            <h2>Your viewing requests will appear here.</h2>

            <p>
              When a house hunter requests a visit to one of your properties,
              you will be able to review and respond to it from this page.
            </p>

            <Link href="/dashboard/properties" className="dark-button">
              Manage properties
            </Link>
          </div>
        ) : (
          <div className="visit-request-list">
            {requests.map((request) => (
              <article key={request.id} className="visit-request-card">
                <div className="visit-request-top">
                  <div>
                    <span className="eyebrow">Viewing request</span>

                    <h2>{request.property_title}</h2>

                    <p>{request.property_location}</p>
                  </div>

                  <span className={statusClass(request.status)}>
                    {statusLabel(request.status)}
                  </span>
                </div>

                <div className="visit-request-grid">
                  <div>
                    <span className="visit-label">House hunter</span>

                    <strong>{request.house_hunter_name}</strong>

                    <a href={`mailto:${request.house_hunter_email}`}>
                      {request.house_hunter_email}
                    </a>

                    {request.house_hunter_phone && (
                      <a href={`tel:${request.house_hunter_phone}`}>
                        {request.house_hunter_phone}
                      </a>
                    )}
                  </div>

                  <div>
                    <span className="visit-label">Requested visit</span>

                    <strong>{formatDate(request.starts_at)}</strong>

                    <span>
                      {formatTime(request.starts_at)} –{" "}
                      {formatTime(request.ends_at)}
                    </span>
                  </div>

                  <div>
                    <span className="visit-label">Request message</span>

                    <p>
                      {request.message ||
                        "The house hunter did not leave a message."}
                    </p>
                  </div>
                </div>

                {request.status === "requested" && (
                  <div className="visit-request-actions">
                    <Link
                      href={`/property/${request.property_id}`}
                      className="light-button"
                    >
                      View property
                    </Link>

                    <button
                      type="button"
                      className="dark-button"
                      disabled={processingId === request.id}
                      onClick={() =>
                        handleDecision(request.id, "confirm_property_visit")
                      }
                    >
                      {processingId === request.id
                        ? "Processing..."
                        : "Confirm visit"}
                    </button>

                    <button
                      type="button"
                      className="danger-button"
                      disabled={processingId === request.id}
                      onClick={() =>
                        handleDecision(request.id, "decline_property_visit")
                      }
                    >
                      Decline
                    </button>
                  </div>
                )}

                {request.status === "confirmed" && (
                  <div className="visit-confirmed-note">
                    <HiCheckCircle aria-hidden="true" /> This viewing has been confirmed.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
