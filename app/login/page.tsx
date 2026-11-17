"use client";
import { useState } from "react";
import { strings } from "@/lib/i18n";
export default function Login() {
  const [language, setLanguage] = useState<"en-IN" | "ta-IN">("en-IN"),
    [passcode, setPasscode] = useState(""),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const t = strings[language];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!r.ok) throw new Error();
      window.location.href = "/";
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-shell" lang={language}>
      <form className="panel login-panel" onSubmit={submit}>
        <div className="row">
          <span className="brand">
            <span className="brand-mark">
              M<span />
            </span>
            MetroSathi
          </span>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              setLanguage(language === "en-IN" ? "ta-IN" : "en-IN")
            }
          >
            {language === "en-IN" ? "தமிழ்" : "English"}
          </button>
        </div>
        <span className="eyebrow">YOUR METRO COMPANION / சென்னை</span>
        <h1>{t.brand}</h1>
        <p className="muted">{t.gateHint}</p>
        <label htmlFor="passcode">{t.passcode}</label>
        <input
          id="passcode"
          autoComplete="current-password"
          type="password"
          maxLength={200}
          required
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {t.wrong}
          </p>
        )}
        <button className="primary" disabled={busy || !passcode}>
          {busy ? t.checking : t.back} →
        </button>
        <small>
          {t.disclaimer}
          <br />
          {t.simulated}
        </small>
      </form>
    </main>
  );
}
