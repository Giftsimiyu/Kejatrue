"use client";

import { useMemo, useState } from "react";
import { createClient } from "../backend/supabase/client";

export type PropertyUnit = {
  id?: string;
  unit_label: string;
  floor_label: string;
  status: "available" | "reserved" | "occupied" | "unavailable";
  rent_override: string;
  bedrooms: string;
  bathrooms: string;
  area_sqft: string;
  amenities: string;
  notes: string;
};

type PropertyUnitManagerProps = {
  propertyId: string;
  initialUnits?: PropertyUnit[];
};

const emptyUnit: PropertyUnit = {
  unit_label: "",
  floor_label: "",
  status: "available",
  rent_override: "",
  bedrooms: "",
  bathrooms: "",
  area_sqft: "",
  amenities: "",
  notes: "",
};

const statusLabels = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  unavailable: "Unavailable",
};

export default function PropertyUnitManager({
  propertyId,
  initialUnits = [],
}: PropertyUnitManagerProps) {
  const supabase = useMemo(() => createClient(), []);

  const [units, setUnits] = useState<PropertyUnit[]>(initialUnits);
  const [unit, setUnit] = useState<PropertyUnit>(emptyUnit);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(field: keyof PropertyUnit, value: string) {
    setUnit((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function addUnit() {
    setError("");
    setSuccess("");

    if (!unit.unit_label.trim()) {
      setError("Enter a unit number or identifier.");
      return;
    }

    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("property_units")
      .insert({
        property_id: propertyId,
        unit_label: unit.unit_label.trim(),
        floor_label: unit.floor_label.trim() || null,
        status: unit.status,
        rent_override:
          unit.rent_override.trim() === "" ? null : Number(unit.rent_override),
        bedrooms: unit.bedrooms.trim() === "" ? null : Number(unit.bedrooms),
        bathrooms: unit.bathrooms.trim() === "" ? null : Number(unit.bathrooms),
        area_sqft: unit.area_sqft.trim() === "" ? null : Number(unit.area_sqft),
        amenities: unit.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notes: unit.notes.trim() || null,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setUnits((current) => [
        ...current,
        {
          id: data.id,
          unit_label: data.unit_label,
          floor_label: data.floor_label ?? "",
          status: data.status,
          rent_override: data.rent_override?.toString() ?? "",
          bedrooms: data.bedrooms?.toString() ?? "",
          bathrooms: data.bathrooms?.toString() ?? "",
          area_sqft: data.area_sqft?.toString() ?? "",
          amenities: Array.isArray(data.amenities)
            ? data.amenities.join(", ")
            : "",
          notes: data.notes ?? "",
        },
      ]);
    }

    setUnit(emptyUnit);
    setSuccess(`${unit.unit_label} was added successfully.`);
  }

  async function updateUnit(updatedUnit: PropertyUnit) {
    if (!updatedUnit.id) return;

    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("property_units")
      .update({
        unit_label: updatedUnit.unit_label.trim(),
        floor_label: updatedUnit.floor_label.trim() || null,
        status: updatedUnit.status,
        rent_override:
          updatedUnit.rent_override.trim() === ""
            ? null
            : Number(updatedUnit.rent_override),
        bedrooms:
          updatedUnit.bedrooms.trim() === ""
            ? null
            : Number(updatedUnit.bedrooms),
        bathrooms:
          updatedUnit.bathrooms.trim() === ""
            ? null
            : Number(updatedUnit.bathrooms),
        area_sqft:
          updatedUnit.area_sqft.trim() === ""
            ? null
            : Number(updatedUnit.area_sqft),
        amenities: updatedUnit.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notes: updatedUnit.notes.trim() || null,
      })
      .eq("id", updatedUnit.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setUnits((current) =>
      current.map((item) => (item.id === updatedUnit.id ? updatedUnit : item)),
    );

    setSuccess(`${updatedUnit.unit_label} was updated successfully.`);
  }

  async function deleteUnit(id: string) {
    const confirmed = window.confirm("Remove this unit from the property?");

    if (!confirmed) return;

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("property_units")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setUnits((current) => current.filter((item) => item.id !== id));

    setSuccess("Unit removed.");
  }

  const availableCount = units.filter(
    (item) => item.status === "available",
  ).length;

  return (
    <section className="space-y-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-black/50">
          UNIT INVENTORY
        </p>

        <h2 className="mt-2 text-2xl font-semibold">Individual units</h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
          Add the individual houses or apartments belonging to this property.
          House hunters will only see units that are currently available or
          reserved.
        </p>
      </div>

      <div className="rounded-2xl border border-black/10 bg-black/2 p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium">Unit number / name *</span>

            <input
              value={unit.unit_label}
              onChange={(event) =>
                updateField("unit_label", event.target.value)
              }
              placeholder="e.g. 1A, 2B, House 07"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Floor</span>

            <input
              value={unit.floor_label}
              onChange={(event) =>
                updateField("floor_label", event.target.value)
              }
              placeholder="e.g. Ground, 2nd Floor"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Availability</span>

            <select
              value={unit.status}
              onChange={(event) => updateField("status", event.target.value)}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            >
              <option value="available">Available</option>

              <option value="reserved">Reserved</option>

              <option value="occupied">Occupied</option>

              <option value="unavailable">Unavailable</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Monthly rent</span>

            <input
              type="number"
              min="0"
              value={unit.rent_override}
              onChange={(event) =>
                updateField("rent_override", event.target.value)
              }
              placeholder="25000"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Bedrooms</span>

            <input
              type="number"
              min="0"
              value={unit.bedrooms}
              onChange={(event) => updateField("bedrooms", event.target.value)}
              placeholder="2"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Bathrooms</span>

            <input
              type="number"
              min="0"
              step="0.5"
              value={unit.bathrooms}
              onChange={(event) => updateField("bathrooms", event.target.value)}
              placeholder="2"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Size (sq ft)</span>

            <input
              type="number"
              min="0"
              value={unit.area_sqft}
              onChange={(event) => updateField("area_sqft", event.target.value)}
              placeholder="850"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Amenities</span>

            <input
              value={unit.amenities}
              onChange={(event) => updateField("amenities", event.target.value)}
              placeholder="Parking, balcony, fitted kitchen"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </label>

          <label className="space-y-2 md:col-span-3">
            <span className="text-sm font-medium">Unit notes</span>

            <textarea
              value={unit.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              placeholder="Anything specific about this unit..."
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={addUnit}
          disabled={saving}
          className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add unit"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Units added</h3>

            <p className="text-sm text-black/50">
              {availableCount} available · {units.length} total
            </p>
          </div>
        </div>

        {units.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center">
            <strong>No units added yet.</strong>

            <p className="mt-2 text-sm text-black/50">
              Add the individual units that house hunters can choose from.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {units.map((item) => (
              <div
                key={item.id ?? item.unit_label}
                className="rounded-2xl border border-black/10 p-4"
              >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-xs text-black/50">Unit</span>

                    <input
                      value={item.unit_label}
                      onChange={(event) =>
                        setUnits((current) =>
                          current.map((existing) =>
                            existing.id === item.id
                              ? {
                                  ...existing,
                                  unit_label: event.target.value,
                                }
                              : existing,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-black/50">Rent</span>

                    <input
                      type="number"
                      value={item.rent_override}
                      onChange={(event) =>
                        setUnits((current) =>
                          current.map((existing) =>
                            existing.id === item.id
                              ? {
                                  ...existing,
                                  rent_override: event.target.value,
                                }
                              : existing,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-black/50">Status</span>

                    <select
                      value={item.status}
                      onChange={(event) =>
                        setUnits((current) =>
                          current.map((existing) =>
                            existing.id === item.id
                              ? {
                                  ...existing,
                                  status: event.target
                                    .value as PropertyUnit["status"],
                                }
                              : existing,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-black/10 px-3 py-2"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => updateUnit(item)}
                      className="rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white"
                    >
                      Save
                    </button>

                    {item.id && (
                      <button
                        type="button"
                        onClick={() => deleteUnit(item.id!)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-sm text-black/50">
                  {item.floor_label || "Floor not specified"}
                  {" · "}
                  {item.bedrooms || "—"} bedrooms
                  {" · "}
                  {item.bathrooms || "—"} bathrooms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
