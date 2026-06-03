"use client";

import { useEffect, useRef, useState } from "react";

type AuthState = "loading" | "authenticated" | "unauthenticated" | "unconfigured";

async function fetchAuthStatus(): Promise<{ authenticated: boolean; configured: boolean }> {
  const res = await fetch("/api/auth/status");
  if (!res.ok) return { authenticated: false, configured: false };
  return res.json();
}

async function postLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.json();
}

export async function postLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAuthStatus().then(({ authenticated, configured }) => {
      if (!configured) {
        setAuthState("unconfigured");
      } else if (authenticated) {
        setAuthState("authenticated");
      } else {
        setAuthState("unauthenticated");
      }
    });
  }, []);

  useEffect(() => {
    if (authState === "unauthenticated") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [authState]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError("");
    const result = await postLogin(password);
    if (result.ok) {
      setAuthState("authenticated");
      setPassword("");
    } else {
      setError(result.error ?? "Väärä salasana.");
      setPassword("");
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  if (authState === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#050817" }}
      >
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: "rgba(148,163,184,0.3)" }}
        />
      </div>
    );
  }

  if (authState === "unconfigured") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#050817" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <div className="text-2xl font-bold mb-2" style={{ color: "#f87171" }}>
            Konfigurointivirhe
          </div>
          <p className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
            <code
              className="px-1 rounded text-xs"
              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
            >
              APP_PASSWORD
            </code>{" "}
            ei ole asetettu palvelimella. Lisää se{" "}
            <code className="text-xs">.env.local</code>-tiedostoon tai Vercel-ympäristömuuttujiin.
          </p>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#050817" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-1" style={{ color: "#e2e8f0" }}>
              Investment OS
            </div>
            <div className="text-sm" style={{ color: "rgba(148,163,184,0.6)" }}>
              Private portfolio dashboard
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "rgba(148,163,184,0.7)" }}
              >
                Salasana
              </label>
              <input
                id="auth-password"
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "rgba(30,41,59,0.8)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  color: "#e2e8f0",
                }}
                placeholder="••••••••"
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background:
                  submitting || !password
                    ? "rgba(99,102,241,0.3)"
                    : "rgba(99,102,241,0.85)",
                color: submitting || !password ? "rgba(226,232,240,0.4)" : "#e2e8f0",
                cursor: submitting || !password ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Kirjaudutaan…" : "Kirjaudu"}
            </button>
          </form>

          <p
            className="mt-6 text-center text-[10px] leading-relaxed"
            style={{ color: "rgba(100,116,139,0.6)" }}
          >
            This app stores portfolio data locally in this browser.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
