"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { createClient } from "../../backend/supabase/client";
import DashboardAccountActions from "../../components/dashboard-account-actions";

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const setupMode = searchParams.get("setup") === "1";

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [roleLabel, setRoleLabel] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?mode=sign-in");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: profile, error } = await supabase
        .from("users")
        .select("full_name, email, avatar, phone, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!profile) {
        setErrorMessage("Your KejaTrue profile could not be found.");
        return;
      }

      const roleLabels: Record<string, string> = {
        house_hunter: "House hunter",
        agent: "Real estate agent",
        landlord: "Landlord",
      };
      const currentRoleLabel = roleLabels[profile.role];

      if (!currentRoleLabel) {
        router.replace("/dashboard");
        return;
      }

      setRoleLabel(currentRoleLabel);
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAvatar(profile.avatar ?? "");
    } catch (error) {
      console.error("Profile loading error:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load your profile.",
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !userId) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `avatars/${userId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("property-images").getPublicUrl(filePath);

      setAvatar(publicUrl);
      setMessage("Profile photo uploaded. Save your profile to continue.");
    } catch (error) {
      console.error("Avatar upload error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload your profile photo.",
      );
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMessage("Please enter your full name.");
      setSaving(false);
      return;
    }

    if (!cleanPhone) {
      setErrorMessage("Please enter your phone number.");
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: cleanName,
          phone: cleanPhone,
          avatar: avatar || null,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", userId);

      if (error) {
        throw error;
      }

      setFullName(cleanName);
      setPhone(cleanPhone);

      setMessage("Your profile has been saved.");

      if (setupMode) {
        setTimeout(() => {
          router.push("/");
        }, 700);
      }
    } catch (error) {
      console.error("Profile save error:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="form-page">
        <div className="form-content">
          <span className="eyebrow">KejaTrue</span>
          <h1>Loading your profile...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <div className="profile-intro">
          <DashboardAccountActions />

          <Link href="/" className="profile-back">
            ← Back to KejaTrue
          </Link>

          <span className="eyebrow">
            {setupMode ? "One last step" : `${roleLabel} profile`}
          </span>

          <h1>
            {setupMode ? "Let's complete your profile." : "Your profile."}
          </h1>

          <p>
            Keep your account details current so people can reach you and your
            KejaTrue experience stays personal.
          </p>

          {setupMode && (
            <div className="profile-completion-note">
              <strong>Almost there.</strong>

              <span>
                Add your name and phone number to complete your KejaTrue
                account.
              </span>
            </div>
          )}
        </div>

        <div className="profile-form-panel">
          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-avatar-section">
              <div className="profile-avatar-large">
                {avatar ? (
                  <img src={avatar} alt="Your profile" />
                ) : (
                  <span>
                    {fullName
                      ? fullName
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "KT"}
                  </span>
                )}
              </div>

              <div>
                <strong>Profile photo</strong>

                <p>Optional, but it helps your account feel more personal.</p>

                <label className="profile-upload-button">
                  Choose photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    hidden
                  />
                </label>
              </div>
            </div>

            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="e.g. Gift Simiyu"
                required
              />
            </label>

            <label>
              Email address
              <input value={email} type="email" disabled />
              <small>Your verified account email cannot be edited here.</small>
            </label>

            <label>
              Phone number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. 0712 345 678"
                required
              />
              <small>
                This may be used when you contact an agent or landlord.
              </small>
            </label>

            {message && <div className="profile-success">{message}</div>}

            {errorMessage && (
              <div className="profile-error">{errorMessage}</div>
            )}

            <button
              type="submit"
              className="dark-button profile-submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save profile"}
              <span>↗</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
