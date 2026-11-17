"use client";
import { useEffect, useRef, useState } from "react";
import { LiveVoiceClient } from "@/lib/voice/live-browser";
export default function LiveVoicePanel({
  enabled,
  language,
  stopRef,
  beforeStart,
}: {
  enabled: boolean;
  language: string;
  stopRef: { current: (() => void) | null };
  beforeStart: () => void;
}) {
  const ta = language === "ta-IN",
    client = useRef<LiveVoiceClient | null>(null);
  const [state, setState] = useState("stopped"),
    [error, setError] = useState(false),
    [user, setUser] = useState(""),
    [model, setModel] = useState("");
  useEffect(() => {
    const stop = () => client.current?.stop();
    stopRef.current = stop;
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      stop();
      stopRef.current = null;
      document.removeEventListener("visibilitychange", hide);
    };
  }, [stopRef]);
  useEffect(() => {
    client.current?.stop();
  }, [language]);
  if (!enabled) return null;
  async function start() {
    beforeStart();
    setError(false);
    setUser("");
    setModel("");
    client.current = new LiveVoiceClient({
      language,
      caption: (role, text) => {
        if (role === "user") setUser(text);
        else setModel(text);
      },
      state: setState,
      failure: () => setError(true),
    });
    await client.current.start();
  }
  const active = state !== "stopped";
  return (
    <section
      className="live-voice"
      aria-label={ta ? "நேரடி குரல் உதவி" : "Live voice help"}
    >
      <button
        type="button"
        className="secondary"
        aria-pressed={active}
        onClick={() => (active ? client.current?.stop() : void start())}
      >
        {active
          ? ta
            ? "நேரடி குரலை நிறுத்து"
            : "Stop Live voice"
          : ta
            ? "Gemini Live குரலைத் தொடங்கு"
            : "Start Gemini Live voice"}
      </button>
      <p className="muted" role="status">
        {state === "connecting"
          ? ta
            ? "இணைக்கிறது…"
            : "Connecting…"
          : state === "listening"
            ? ta
              ? "மைக் செயலில் · 45 வினாடி வரம்பு"
              : "Microphone active · 45 second limit"
            : ta
              ? "விருப்ப நேரடி குரல் · மாதிரி தரவு மட்டும்"
              : "Optional Live voice · demo data only"}
      </p>
      <small>
        {ta
          ? "ஒலியும் உரையும் Google Gemini க்கு நேரடியாக அனுப்பப்படும். கோரிக்கையை உருவாக்க ஆதரவு மையத்தைப் பயன்படுத்தவும்."
          : "Audio and captions are sent directly to Google Gemini. Use Support centre to review and confirm tickets."}
      </small>
      {error && (
        <p role="alert" className="voice-notice">
          {ta
            ? "Live கிடைக்கவில்லை. மேலே உள்ள உலாவி குரல் அல்லது உரையைப் பயன்படுத்தலாம்."
            : "Live is unavailable. Browser voice and text above remain available."}
        </p>
      )}
      <div aria-live="polite">
        {user && (
          <p>
            {ta ? "நீங்கள்" : "You"}: {user}
          </p>
        )}
        {model && <p>MetroSathi: {model}</p>}
      </div>
    </section>
  );
}
