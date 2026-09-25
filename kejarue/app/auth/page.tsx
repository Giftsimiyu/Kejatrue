"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../backend/supabase/client";
import { roles, type RoleId } from "../lib/roles";
import { BrandLink, SiteFooter } from "../components/site-chrome";

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [role, setRole] = useState<RoleId>("house-hunter");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) return;
    const timeoutId = window.setTimeout(() => setMessage(error), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function continueWithGoogle() {
    setIsSubmitting(true);
    setMessage("");
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("role", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const supabase = createClient();
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { role } },
          });

    if (result.error) setMessage(result.error.message);
    else
      setMessage(
        mode === "sign-up"
          ? "Check your email to confirm your account."
          : "You are signed in. Refreshing your workspace...",
      );
    setIsSubmitting(false);
    if (!result.error && mode === "sign-in") {
      const signedInRole = result.data.user?.user_metadata?.role;
      router.push(signedInRole === "house-hunter" ? "/" : "/dashboard");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <BrandLink />
        <div className="auth-intro-copy">
          <span className="eyebrow">A clearer way home</span>
          <h1>
            Make a decision you can <em>live with.</em>
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
      <section className="auth-panel">
        <div className="auth-panel-inner">
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
              : "Continue where you left off."}
          </p>
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
