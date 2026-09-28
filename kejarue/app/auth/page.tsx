"use client";

import { type FormEvent, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "../backend/supabase/client";

import { roles, type RoleId } from "../lib/roles";

import { BrandLink, SiteFooter } from "../components/site-chrome";

function isValidRole(value: string | null): value is RoleId {
  return value === "house-hunter" || value === "agent" || value === "landlord";
}

export default function AuthPage() {
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role");
  const requestedMode = searchParams.get("mode");
  const requestedError = searchParams.get("error");

  const [mode, setMode] = useState<"sign-in" | "sign-up">(
    requestedMode === "sign-in" ? "sign-in" : "sign-up",
  );

  const [role, setRole] = useState<RoleId>(
    isValidRole(requestedRole) ? requestedRole : "house-hunter",
  );

  const [message, setMessage] = useState(requestedError || "");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  /*
   * Google authentication
   */

  async function continueWithGoogle() {
    setIsSubmitting(true);
    setMessage("");

    const supabase = createClient();

    const callbackUrl = new URL("/auth/callback", window.location.origin);

    callbackUrl.searchParams.set("role", role);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",

      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setMessage(error.message);

      setIsSubmitting(false);
    }
  }

  /*
   * Email authentication
   */

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    const email = String(form.get("email") || "").trim();

    const password = String(form.get("password") || "");

    const supabase = createClient();

    /*
     * SIGN IN
     */

    if (mode === "sign-in") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);

        setIsSubmitting(false);

        return;
      }

      if (!data.user) {
        setMessage("Your account could not be loaded.");

        setIsSubmitting(false);

        return;
      }

      /*
       * IMPORTANT:
       *
       * The database is the source
       * of truth for the user's role.
       */

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setMessage(
          "Your account was found, but your KejaTrue profile could not be loaded.",
        );

        setIsSubmitting(false);

        return;
      }

      if (profile.role === "house_hunter") {
        router.push("/");
      } else {
        router.push("/dashboard");
      }

      return;
    }

    /*
     * SIGN UP
     */

    const { data, error } = await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          role,
        },
      },
    });

    if (error) {
      setMessage(error.message);

      setIsSubmitting(false);

      return;
    }

    /*
     * If email confirmation is enabled,
     * Supabase will not create a live
     * session until the email is confirmed.
     */

    if (!data.session) {
      setMessage(
        "Your account was created. Check your email to confirm your account.",
      );

      setIsSubmitting(false);

      return;
    }

    /*
     * Make sure public.users has the
     * same role immediately.
     */

    if (data.user) {
      const databaseRole = role === "house-hunter" ? "house_hunter" : role;

      await supabase
        .from("users")
        .update({
          role: databaseRole,

          email: data.user.email,

          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", data.user.id);
    }

    /*
     * Send the new user to the
     * appropriate first experience.
     */

    if (role === "house-hunter") {
      router.push("/");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="auth-page">
      {/* =====================================
          INTRO
      ====================================== */}

      <section className="auth-intro">
        <BrandLink />

        <div className="auth-intro-copy">
          <span className="eyebrow">A clearer way home</span>

          <h1>
            Make a decision you can
            <em> live with.</em>
          </h1>

          <p>
            Compare more than a rent price. See the costs, context and lived
            experience behind every property.
          </p>
        </div>

        <span className="auth-caption">
          Property intelligence for Kenya, built around real people.
        </span>
      </section>

      {/* =====================================
          AUTH PANEL
      ====================================== */}

      <section className="auth-panel">
        <div className="auth-panel-inner">
          {/* MODE */}

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "sign-up" ? "active" : ""}
              onClick={() => setMode("sign-up")}
            >
              Create account
            </button>

            <button
              type="button"
              className={mode === "sign-in" ? "active" : ""}
              onClick={() => setMode("sign-in")}
            >
              Sign in
            </button>
          </div>

          <h2>
            {mode === "sign-up"
              ? "Start with your perspective."
              : "Welcome back."}
          </h2>

          <p className="auth-subtitle">
            {mode === "sign-up"
              ? "Tell us how you will use KejaTrue."
              : "Your existing role determines the workspace you enter."}
          </p>

          {/* ROLE SELECTION */}

          {mode === "sign-up" && (
            <div className="role-grid">
              {roles.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={
                    role === item.id ? "role-choice selected" : "role-choice"
                  }
                  onClick={() => setRole(item.id)}
                >
                  <span className="role-icon">{item.icon}</span>

                  <span>
                    <strong>{item.label}</strong>

                    <small>{item.description}</small>
                  </span>

                  <i>{role === item.id ? "●" : "○"}</i>
                </button>
              ))}
            </div>
          )}

          {/* GOOGLE */}

          <button
            type="button"
            className="google-button"
            disabled={isSubmitting}
            onClick={continueWithGoogle}
          >
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>

          <div className="auth-divider" aria-hidden="true">
            <span>or use your email</span>
          </div>

          {/* EMAIL FORM */}

          <form onSubmit={submit} className="auth-form">
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                name="password"
                type="password"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </label>

            <button
              className="dark-button auth-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Working..."
                : mode === "sign-up"
                  ? "Create my account"
                  : "Sign in"}

              <span>↗</span>
            </button>
          </form>

          {/* MESSAGE */}

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <small className="auth-legal">
            By continuing, you agree to use KejaTrue to share accurate property
            information.
          </small>
        </div>

        <SiteFooter />
      </section>
    </main>
  );
}
