"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Language, ChatMessage } from "@/lib/schemas";
import type {
  Passenger,
  Card,
  Transaction,
  Recharge,
} from "@/lib/metro/fixtures";
import type { Ticket } from "@/lib/metro/store";
import type { AgentResult, TicketProposal } from "@/lib/agent/types";
import { strings, type StringKey } from "@/lib/i18n";
import {
  stations,
  VERIFIED_AT,
  FARE_URL,
  CONTACT_URL,
  RECHARGE_URL,
  LOST_URL,
} from "@/lib/metro/official";
import {
  recognitionConstructor,
  speak,
  voiceErrorKey,
  type Recognition,
} from "@/lib/voice/browser";
import LiveVoicePanel from "./LiveVoicePanel";
import { useLanguagePreference } from "@/lib/useLanguagePreference";
import { todayInIndia } from "@/lib/dates";
import { detectLanguage } from "@/lib/language";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n,
  );
type Section =
  "helpline" | "cards" | "transactions" | "fares" | "support" | "help";
const sections: Section[] = [
  "helpline",
  "cards",
  "transactions",
  "fares",
  "support",
  "help",
];
const icons = ["◉", "▣", "↔", "⌖", "◌", "↗"];
async function request<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "UNAVAILABLE");
  return data;
}
export default function Dashboard() {
  const [language, setLanguage] = useLanguagePreference();
  const [liveEnabled, setLiveEnabled] = useState(false);
  const liveStop = useRef<(() => void) | null>(null);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [autoTamil, setAutoTamil] = useState(false);
  const locale =
    language === "auto" ? (autoTamil ? "ta-IN" : "en-IN") : language;
  const t = useCallback((k: StringKey) => strings[locale][k], [locale]);
  const [section, setSection] = useState<Section>("helpline"),
    [profiles, setProfiles] = useState<Passenger[]>([]),
    [passenger, setPassenger] = useState<Passenger | null>(null),
    [storage, setStorage] = useState("memory"),
    [demo, setDemo] = useState(true),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const [cards, setCards] = useState<Card[]>([]),
    [transactions, setTransactions] = useState<Transaction[]>([]),
    [recharges, setRecharges] = useState<Recharge[]>([]),
    [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [steps, setSteps] = useState<AgentResult["steps"]>([]),
    [proposal, setProposal] = useState<TicketProposal | null>(null),
    [ticketKey, setTicketKey] = useState("");
  const [listening, setListening] = useState(false),
    [voiceNotice, setVoiceNotice] = useState<StringKey | null>(null),
    [speaking, setSpeaking] = useState(false);
  const rec = useRef<Recognition | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    bottom = useRef<HTMLDivElement>(null),
    abort = useRef<AbortController | null>(null);
  const confirmationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (proposal) {
      confirmationRef.current?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
      confirmationRef.current?.focus();
    }
  }, [proposal]);
  const [category, setCategory] = useState("recharge"),
    [description, setDescription] = useState(""),
    [saved, setSaved] = useState("");
  const [asOf, setAsOf] = useState(todayInIndia());
  const [from, setFrom] = useState("AIRPORT"),
    [to, setTo] = useState("MEENAMBAKKAM"),
    [query, setQuery] = useState(""),
    [fare, setFare] = useState<{
      standard?: number;
      discounted?: number;
      verified?: boolean;
    } | null>(null);
  const [supported, setSupported] = useState(false);
  const stamp = (s: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(s));
  const status = (s: string) =>
    t((s in strings[locale] ? s : "unknown") as StringKey);
  const stopVoice = useCallback(() => {
    liveStop.current?.();
    if (timer.current) clearTimeout(timer.current);
    if (rec.current) {
      rec.current.onresult = null;
      rec.current.onerror = null;
      rec.current.onend = null;
      rec.current.abort();
      rec.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setListening(false);
    setSpeaking(false);
  }, []);
  const loadRecords = useCallback(async () => {
    const [c, tr, ti] = await Promise.all([
      request<{ cards: Card[]; recharges: Recharge[] }>("/api/cards"),
      request<{ transactions: Transaction[] }>("/api/transactions"),
      request<{ tickets: Ticket[] }>("/api/tickets"),
    ]);
    setCards(c.cards);
    setRecharges(c.recharges);
    setTransactions(tr.transactions);
    setTickets(ti.tickets);
  }, []);
  const init = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const me = await request<{
        passenger: Passenger | null;
        profiles: Passenger[];
        storage: string;
        demo_mode: boolean;
        live_enabled?: boolean;
      }>("/api/me");
      setLiveEnabled(me.live_enabled === true);
      setProfiles(me.profiles);
      setPassenger(me.passenger);
      setStorage(me.storage);
      setDemo(me.demo_mode);
      if (me.passenger) await loadRecords();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loadRecords]);
  useEffect(() => {
    void init();
    setSupported(Boolean(recognitionConstructor()));
    const hide = () => {
      if (document.hidden) stopVoice();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      stopVoice();
      abort.current?.abort();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [init, stopVoice]);
  useEffect(() => {
    document.documentElement.lang = locale;
    stopVoice();
  }, [locale, stopVoice]);
  useEffect(() => {
    stopVoice();
  }, [section, stopVoice]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [messages, busy]);
  async function select(id: string) {
    if (busy) return;
    stopVoice();
    setLoading(true);
    setError(false);
    setMessages([]);
    setLastFailed(null);
    setProposal(null);
    setCards([]);
    setTransactions([]);
    setRecharges([]);
    setTickets([]);
    setSteps([]);
    setSaved("");
    setInput("");
    setDescription("");
    try {
      await request("/api/session", { fixture: id });
      await init();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  async function send(text = input) {
    if (!text.trim() || busy || !passenger) return;
    stopVoice();
    setError(false);
    setBusy(true);
    setInput("");
    setSteps([]);
    setLastFailed(null);
    if (language === "auto") setAutoTamil(detectLanguage(text) === "ta-IN");
    const next: ChatMessage[] = [
      ...messages,
      { role: "user", text: text.trim() },
    ];
    setMessages(next);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-19), language }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(50000),
        ]),
      });
      const data: AgentResult = await r.json();
      if (!r.ok && !data.error_code) throw new Error();
      if (data.error_code) setLastFailed(text);
      setMessages([
        ...next,
        {
          role: "model",
          text:
            data.reply +
            (data.error_code && data.correlation_id
              ? `\n${locale === "ta-IN" ? "கோரிக்கை குறிப்பு" : "Request reference"}: ${data.correlation_id}`
              : ""),
        },
      ]);
      setSteps(data.steps);
      if (data.proposal) {
        setProposal(data.proposal);
        setTicketKey(crypto.randomUUID());
      }
    } catch {
      setError(true);
      setInput(text);
    } finally {
      setBusy(false);
    }
  }
  function listen() {
    stopVoice();
    setVoiceNotice(null);
    const C = recognitionConstructor();
    if (!C) {
      setVoiceNotice("unsupported");
      return;
    }
    const r = new C();
    r.lang = locale;
    r.continuous = false;
    r.interimResults = true;
    rec.current = r;
    r.onresult = (e) => {
      setInput(
        Array.from(e.results)
          .map((x) => x[0].transcript)
          .join(" "),
      );
    };
    r.onerror = (e) => {
      setVoiceNotice(voiceErrorKey(e.error));
      stopVoice();
    };
    r.onend = () => {
      setListening(false);
      if (timer.current) clearTimeout(timer.current);
    };
    try {
      r.start();
      setListening(true);
      timer.current = setTimeout(stopVoice, 45000);
    } catch {
      setVoiceNotice("voiceError");
      stopVoice();
    }
  }
  function read(text: string) {
    stopVoice();
    const response = speak(
      text,
      /[\u0B80-\u0BFF]/.test(text) ? "ta-IN" : locale,
      () => setSpeaking(false),
    );
    if (response !== "ok") setVoiceNotice(response);
    else setSpeaking(true);
  }
  async function prepare(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    setSaved("");
    try {
      const p = await request<TicketProposal>("/api/tickets/prepare", {
        category,
        description,
        language: locale,
        ...(cards[0] ? { cardId: cards[0].id } : {}),
      });
      setProposal(p);
      setTicketKey(crypto.randomUUID());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!proposal || busy) return;
    setBusy(true);
    setError(false);
    try {
      const r = await request<{ ticket: Ticket }>("/api/tickets", {
        confirmation: proposal.confirmation,
        confirmed: true,
        idempotencyKey: ticketKey,
      });
      setSaved(r.ticket.ticket_number);
      setProposal(null);
      setDescription("");
      await loadRecords();
      setSection("support");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function lookup() {
    setBusy(true);
    setError(false);
    try {
      setFare(await request(`/api/fares?from=${from}&to=${to}&asOf=${asOf}`));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  const visibleStations = stations.filter((s) =>
    `${s.name_en} ${s.name_ta}`.toLowerCase().includes(query.toLowerCase()),
  );
  const cardPanel = (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">METROSATHI / SMART CARD</span>
          <h2>{t("cards")}</h2>
        </div>
        <span className="tag">{t("demo")}</span>
      </div>
      <p className="muted">{t("simulated")}</p>
      {cards.map((c) => (
        <article className="smart-card" key={c.id}>
          <div className="row">
            <span className="wordmark">◈ MetroSathi</span>
            <span className="tag">{t("demo")}</span>
          </div>
          <p>{t(c.kind as "ncmc" | "legacy_cmrl_stored_value")}</p>
          <p className="card-number">{c.masked_number}</p>
          <div className="row">
            <div>
              <span className="muted">{t("balance")}</span>
              <strong className="balance">{money(c.balance)}</strong>
            </div>
            <span className="chip">{status(c.status)}</span>
          </div>
          <small>
            {t("updated")} · {stamp(c.updated_at)}
          </small>
        </article>
      ))}
    </>
  );
  const transactionsPanel = (
    <>
      <div className="section-heading">
        <h2>{t("recent")}</h2>
        <span className="tag">{t("demo")}</span>
      </div>
      {!transactions.length && <p>{t("empty")}</p>}
      {transactions.map((tr) => (
        <div className="transaction" key={tr.id}>
          <span className="transaction-icon">
            {tr.type === "travel" ? "↗" : "↓"}
          </span>
          <div>
            <strong>{status(tr.type)}</strong>
            <small>
              {tr.reference} · {stamp(tr.occurred_at)}
            </small>
          </div>
          <div className="align-right">
            <strong>{money(tr.amount)}</strong>
            <small>
              {status(tr.status)} · {t("demo")}
            </small>
          </div>
        </div>
      ))}
    </>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="MetroSathi home">
          <span className="brand-mark">
            M<span />
          </span>
          <span>
            MetroSathi<small>சென்னை · CHENNAI</small>
          </span>
        </a>
        <div className="sidebar-label">{t("brand")}</div>
        <nav aria-label={t("helpline")}>
          {sections.map((s, i) => (
            <button
              key={s}
              className={section === s ? "nav-item selected" : "nav-item"}
              onClick={() => setSection(s)}
            >
              <span aria-hidden="true">{icons[i]}</span>
              {t(s)}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="tag">{t("demo")}</span>
          <p>{t("disclaimer")}</p>
          <a
            href="https://chennaimetrorail.org/"
            target="_blank"
            rel="noreferrer"
          >
            {t("officialSite")} ↗
          </a>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            CHENNAI <span>/</span> {t(section)}
          </span>
          <div className="header-controls">
            <label className="sr-only" htmlFor="language">
              {t("selectLanguage")}
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="en-IN">English</option>
              <option value="ta-IN">தமிழ்</option>
              <option value="auto">Auto · தானியங்கி</option>
            </select>
            {passenger && (
              <>
                <label className="sr-only" htmlFor="passenger">
                  {t("choose")}
                </label>
                <select
                  id="passenger"
                  disabled={busy || loading}
                  value={passenger.id}
                  onChange={(e) => void select(e.target.value)}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button
              className="text-button"
              onClick={async () => {
                stopVoice();
                try {
                  await request("/api/logout", {});
                  window.location.href = "/login";
                } catch {
                  setError(true);
                }
              }}
            >
              {t("logout")}
            </button>
          </div>
        </header>
        <main className="content">
          <div className="disclosure">
            <span aria-hidden="true">◈</span>
            <strong>{t("demo")}</strong>
            <span>{t("disclaimer")}</span>
          </div>
          {error && (
            <div className="error" role="alert">
              {t("error")}{" "}
              <button onClick={() => void init()}>{t("retry")}</button>
            </div>
          )}
          {loading ? (
            <div
              className="skeleton"
              role="status"
              aria-label={t("checking")}
            />
          ) : !demo ? (
            <section className="panel">
              <h1>MetroSathi</h1>
              <p>{t("production")}</p>
            </section>
          ) : !passenger ? (
            <section className="panel profile-picker">
              <span className="eyebrow">VANAKKAM / வணக்கம்</span>
              <h1>{t("choose")}</h1>
              <p className="muted">{t("chooseHint")}</p>
              <div className="profile-grid">
                {profiles.map((p) => (
                  <button key={p.id} onClick={() => void select(p.id)}>
                    <span className="avatar">{p.name[0]}</span>
                    <strong>{p.name}</strong>
                    <small>
                      {t("demo")} · {p.language}
                    </small>
                    →
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <>
              {section === "helpline" && (
                <>
                  <section className="hero">
                    <span className="eyebrow">
                      {locale === "ta-IN"
                        ? "உங்கள் தினசரி மெட்ரோ துணை"
                        : "YOUR EVERYDAY METRO COMPANION"}
                    </span>
                    <h1>{t("welcome")}</h1>
                    <p>{t("intro")}</p>
                    <div className="route-art" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </section>
                  <div className="dashboard-grid">
                    <section className="panel chat-panel">
                      <div className="section-heading">
                        <div className="row">
                          <span className="assistant-avatar">M</span>
                          <div>
                            <h2>MetroSathi</h2>
                            <small className="muted">
                              {locale === "ta-IN" ? "தமிழ்" : "English"} ·{" "}
                              {t("helpline")}
                            </small>
                          </div>
                        </div>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            stopVoice();
                            setMessages([]);
                            setLastFailed(null);
                            setSteps([]);
                            setProposal(null);
                          }}
                        >
                          {t("clear")}
                        </button>
                      </div>
                      <div
                        className="conversation"
                        aria-live="polite"
                        aria-busy={busy}
                      >
                        {messages.length === 0 ? (
                          <div className="empty-chat">
                            <span className="conversation-orbit">◈</span>
                            <h3>{t("start")}</h3>
                            <p>{t("startHint")}</p>
                            <div className="quick-actions">
                              {(
                                [
                                  "checkRecharge",
                                  "checkBalance",
                                  "lost",
                                  "fareQuick",
                                ] as StringKey[]
                              ).map((k) => (
                                <button
                                  disabled={busy}
                                  key={k}
                                  onClick={() => void send(t(k))}
                                >
                                  {t(k)} ↗
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          messages.map((m, i) => (
                            <article className={`message ${m.role}`} key={i}>
                              <small>
                                {m.role === "user"
                                  ? passenger.name
                                  : "MetroSathi"}
                              </small>
                              <p>{m.text}</p>
                              {m.role === "model" && (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    speaking ? stopVoice() : read(m.text)
                                  }
                                >
                                  {speaking ? t("mute") : t("speak")}
                                </button>
                              )}
                            </article>
                          ))
                        )}
                        {busy && (
                          <p className="activity" role="status">
                            ◌ {t("thinking")}
                          </p>
                        )}
                        {lastFailed && (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => void send(lastFailed)}
                          >
                            {t("retry")}
                          </button>
                        )}
                        {steps.length > 0 && (
                          <div className="activity">
                            {steps.every((s) => s.ok)
                              ? t("toolDone")
                              : t("toolFail")}{" "}
                            · {steps.length}
                          </div>
                        )}
                        <div ref={bottom} />
                      </div>
                      <div className="voice-bar">
                        <button
                          className={
                            listening
                              ? "voice-button recording"
                              : "voice-button"
                          }
                          onClick={listening ? stopVoice : listen}
                          disabled={busy}
                          aria-pressed={listening}
                        >
                          <span aria-hidden="true">
                            {listening ? "■" : "◉"}
                          </span>{" "}
                          {listening ? t("stop") : t("talk")}
                        </button>
                        <span>
                          {listening ? t("listening") : t("voiceHint")}
                        </span>
                      </div>
                      {(!supported || voiceNotice) && (
                        <p className="voice-notice" role="status">
                          {t(voiceNotice ?? "unsupported")}
                        </p>
                      )}
                      <form
                        className="composer"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void send();
                        }}
                      >
                        <label className="sr-only" htmlFor="chat">
                          {t("captions")}
                        </label>
                        <textarea
                          id="chat"
                          rows={2}
                          maxLength={4000}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder={t("textHint")}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              !e.shiftKey &&
                              !e.nativeEvent.isComposing
                            ) {
                              e.preventDefault();
                              void send();
                            }
                          }}
                        />
                        <button
                          className="primary"
                          disabled={busy || !input.trim()}
                        >
                          {t("send")} ↑
                        </button>
                      </form>
                      <LiveVoicePanel
                        enabled={liveEnabled}
                        language={locale}
                        stopRef={liveStop}
                        beforeStart={stopVoice}
                      />
                      <small className="privacy">{t("privacy")}</small>
                    </section>
                    <aside className="card-column">
                      <section className="panel">{cardPanel}</section>
                      <section className="panel recharge-panel">
                        <span className="eyebrow">{t("recharge")}</span>
                        <h3>
                          {recharges[0]?.payment_status === "success" &&
                          recharges[0]?.card_update_status === "pending"
                            ? t("pending")
                            : t("recharge")}
                        </h3>
                        <p>{t("rechargeHint")}</p>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => void send(t("checkRecharge"))}
                        >
                          {t("checkRecharge")} →
                        </button>
                      </section>
                      <section className="panel">{transactionsPanel}</section>
                    </aside>
                  </div>
                </>
              )}
              {section === "cards" && (
                <div className="two-column">
                  <section className="panel">{cardPanel}</section>
                  <section className="panel">
                    <h2>{t("recharge")}</h2>
                    <p className="muted">{t("rechargeHint")}</p>
                    {recharges.map((r) => (
                      <article className="record" key={r.id}>
                        <div className="row">
                          <strong>{money(r.amount)}</strong>
                          <span className="tag">{t("demo")}</span>
                        </div>
                        <p>{r.reference}</p>
                        <p>
                          {t("payment")}:{" "}
                          <span className="chip">
                            {status(r.payment_status)}
                          </span>
                        </p>
                        <p>
                          {t("cardUpdate")}:{" "}
                          <span className="chip">
                            {status(r.card_update_status)}
                          </span>
                        </p>
                        <small>{stamp(r.created_at)}</small>
                      </article>
                    ))}
                    <p>{t("rechargeCaveat")}</p>
                    <a href={RECHARGE_URL} target="_blank" rel="noreferrer">
                      {t("officialRecharge")} ↗
                    </a>
                  </section>
                </div>
              )}
              {section === "transactions" && (
                <section className="panel">{transactionsPanel}</section>
              )}
              {section === "fares" && (
                <div className="two-column">
                  <section className="panel">
                    <span className="eyebrow">CHENNAI METRO / CMRL</span>
                    <h1>{t("fares")}</h1>
                    <p className="muted">{t("coverage")}</p>
                    <div className="fare-inputs">
                      <label>
                        {locale === "ta-IN" ? "கட்டண தேதி" : "Fare date"}
                        <input
                          type="date"
                          value={asOf}
                          onChange={(e) => {
                            setAsOf(e.target.value);
                            setFare(null);
                          }}
                        />
                      </label>
                      <label>
                        {t("from")}
                        <select
                          value={from}
                          onChange={(e) => {
                            setFrom(e.target.value);
                            setFare(null);
                          }}
                        >
                          {stations.map((s) => (
                            <option value={s.code} key={s.code}>
                              {locale === "ta-IN"
                                ? (s.name_ta ?? s.name_en)
                                : s.name_en}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span aria-hidden="true">↓</span>
                      <label>
                        {t("to")}
                        <select
                          value={to}
                          onChange={(e) => {
                            setTo(e.target.value);
                            setFare(null);
                          }}
                        >
                          {stations.map((s) => (
                            <option value={s.code} key={s.code}>
                              {locale === "ta-IN"
                                ? (s.name_ta ?? s.name_en)
                                : s.name_en}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => void lookup()}
                      >
                        {t("lookup")}
                      </button>
                    </div>
                    {fare && (
                      <div className="fare-result" role="status">
                        {fare.standard !== undefined ? (
                          <>
                            <p>
                              {t("standard")}{" "}
                              <strong>{money(fare.standard)}</strong>
                            </p>
                            <p>
                              {t("discounted")}{" "}
                              <strong>{money(fare.discounted!)}</strong>
                            </p>
                            <p>{t("effective")}</p>
                          </>
                        ) : (
                          <p>{t("unverified")}</p>
                        )}
                      </div>
                    )}
                    <p className="muted">
                      {t("verified")}: {VERIFIED_AT}
                    </p>
                    <a target="_blank" rel="noreferrer" href={FARE_URL}>
                      {t("officialFare")} ↗
                    </a>
                  </section>
                  <section className="panel">
                    <label htmlFor="station-search">{t("query")}</label>
                    <input
                      id="station-search"
                      value={query}
                      maxLength={80}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {visibleStations.length === 0 && <p>{t("none")}</p>}
                    {visibleStations.map((s) => (
                      <div className="station" key={s.code}>
                        <span className="station-dot" />
                        <div>
                          <strong>{s.name_en}</strong>
                          <small lang="ta">{s.name_ta}</small>
                          {s.line_ids.length > 1 && (
                            <span className="chip">
                              {locale === "ta-IN"
                                ? "மாற்று நிலையம்"
                                : "Interchange"}
                            </span>
                          )}
                        </div>
                        <span className="muted">{s.corridor}</span>
                      </div>
                    ))}
                  </section>
                </div>
              )}
              {section === "support" && (
                <div className="two-column">
                  <section className="panel">
                    <span className="eyebrow">HERE TO HELP / உதவிக்காக</span>
                    <h1>{t("support")}</h1>
                    <p>{t("ticketNotice")}</p>
                    <form className="ticket-form" onSubmit={prepare}>
                      <label>
                        {t("category")}
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {["recharge", "card", "travel", "other"].map((c) => (
                            <option value={c} key={c}>
                              {t(c as StringKey)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t("description")}
                        <textarea
                          rows={5}
                          minLength={10}
                          maxLength={800}
                          required
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </label>
                      <button
                        className="primary"
                        disabled={busy || description.trim().length < 10}
                      >
                        {t("prepare")} →
                      </button>
                    </form>
                  </section>
                  <section className="panel">
                    <h2>{t("tickets")}</h2>
                    {saved && (
                      <p className="success" role="status">
                        {t("ticketCreated")}: {saved}
                      </p>
                    )}
                    <p className="muted">
                      {t(storage === "memory" ? "memory" : "supabase")}
                    </p>
                    {!tickets.length && <p>{t("empty")}</p>}
                    {tickets.map((ti) => (
                      <article className="record" key={ti.id}>
                        <div className="row">
                          <strong>{ti.ticket_number}</strong>
                          <span className="chip">{status(ti.status)}</span>
                        </div>
                        <p>{ti.description}</p>
                        <small>
                          {stamp(ti.created_at)} · {t("demo")}
                        </small>
                      </article>
                    ))}
                  </section>
                </div>
              )}
              {section === "help" && (
                <section className="panel official-help">
                  <span className="eyebrow">OFFICIAL SOURCES / CMRL</span>
                  <h1>{t("help")}</h1>
                  <p>{t("disclaimer")}</p>
                  <article>
                    <h2>{t("officialContact")}</h2>
                    <p>{t("contactHint")}</p>
                    <a href={CONTACT_URL} target="_blank" rel="noreferrer">
                      {t("officialContact")} ↗
                    </a>
                  </article>
                  <article>
                    <h2>{t("recharge")}</h2>
                    <p>{t("rechargeCaveat")}</p>
                    <a href={RECHARGE_URL} target="_blank" rel="noreferrer">
                      {t("officialRecharge")} ↗
                    </a>
                  </article>
                  <article>
                    <h2>{t("lost")}</h2>
                    <p>{t("lostPolicy")}</p>
                    <a href={LOST_URL} target="_blank" rel="noreferrer">
                      {t("policySource")} ↗
                    </a>
                  </article>
                  <p className="muted">
                    {t("verified")}: {VERIFIED_AT}
                  </p>
                </section>
              )}
            </>
          )}
          {proposal && (
            <section
              className="confirmation panel"
              ref={confirmationRef}
              tabIndex={-1}
              role="region"
              aria-labelledby="confirmation-title"
            >
              <span className="tag">{t("demo")}</span>
              <h2 id="confirmation-title">{t("review")}</h2>
              <p>{t("ticketNotice")}</p>
              <dl>
                <dt>{t("category")}</dt>
                <dd>{t(proposal.draft.category as StringKey)}</dd>
                <dt>{t("description")}</dt>
                <dd>{proposal.draft.description}</dd>
                <dt>{t("cards")}</dt>
                <dd>
                  {cards.find((c) => c.id === proposal.draft.cardId)
                    ?.masked_number ?? "—"}
                </dd>
              </dl>
              <div className="row">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setProposal(null)}
                >
                  {t("cancel")}
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void confirm()}
                >
                  {t("confirm")}
                </button>
              </div>
            </section>
          )}
          <footer>
            {t("simulated")}
            <span>MetroSathi · Chennai</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
