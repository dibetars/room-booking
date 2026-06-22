"use client";

import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: {
        url: string;
        parentElement: HTMLElement;
        prefill?: { name?: string; email?: string };
      }) => void;
    };
  }
}

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? "https://calendly.com/jsowdkr221";

type Step = "form" | "calendar" | "done";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
}

export default function DemoPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [leadId, setLeadId] = useState("");
  const calendlyRef = useRef<HTMLDivElement>(null);

  // Load Calendly widget script
  useEffect(() => {
    if (step !== "calendar") return;

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = () => initCalendly();
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://assets.calendly.com/assets/external/widget.css";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(link);
    };
  }, [step]);

  function initCalendly() {
    if (!window.Calendly || !calendlyRef.current) return;
    window.Calendly.initInlineWidget({
      url: CALENDLY_URL,
      parentElement: calendlyRef.current,
      prefill: {
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
      },
    });
  }

  // Listen for Calendly booking completion via postMessage
  useEffect(() => {
    if (step !== "calendar") return;

    function onMessage(e: MessageEvent) {
      if (e.data?.event === "calendly.event_scheduled") {
        setStep("done");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/zoho/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      setLeadId(data.leadId ?? "");
      setStep("calendar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Hero */}
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
        <span className="inline-block rounded-full bg-blue-500/20 px-4 py-1 text-sm font-medium text-blue-300 ring-1 ring-blue-500/40 mb-6">
          Free Consultation
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Book a Meeting With Our Team
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Tell us a bit about yourself and pick a time that works — we&apos;ll handle the rest.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="mx-auto max-w-md px-6 mb-10">
        <div className="flex items-center gap-3">
          {(["form", "calendar", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3 flex-1">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 transition-colors ${
                  step === s
                    ? "bg-blue-500 ring-blue-400 text-white"
                    : i < ["form", "calendar", "done"].indexOf(step)
                    ? "bg-green-500 ring-green-400 text-white"
                    : "bg-slate-700 ring-slate-600 text-slate-400"
                }`}
              >
                {i < ["form", "calendar", "done"].indexOf(step) ? "✓" : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${
                    i < ["form", "calendar", "done"].indexOf(step)
                      ? "bg-green-500"
                      : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Your details</span>
          <span>Pick a time</span>
          <span>Confirmed</span>
        </div>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-2xl px-6 pb-20">
        {step === "form" && (
          <div className="rounded-2xl bg-slate-800/60 p-8 ring-1 ring-slate-700">
            <h2 className="text-xl font-semibold mb-6">Your details</h2>
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="First name"
                  required
                  value={form.firstName}
                  onChange={(v) => setForm({ ...form, firstName: v })}
                  placeholder="Jane"
                />
                <Field
                  label="Last name"
                  required
                  value={form.lastName}
                  onChange={(v) => setForm({ ...form, lastName: v })}
                  placeholder="Smith"
                />
              </div>
              <Field
                label="Work email"
                type="email"
                required
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="jane@company.com"
              />
              <Field
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="+1 555 000 0000"
              />
              <Field
                label="Company"
                value={form.company}
                onChange={(v) => setForm({ ...form, company: v })}
                placeholder="Acme Inc."
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Saving…" : "Continue to scheduling →"}
              </button>
            </form>
          </div>
        )}

        {step === "calendar" && (
          <div className="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 overflow-hidden">
            <div className="px-8 pt-6 pb-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold">Pick a time</h2>
              <p className="text-sm text-slate-400 mt-1">
                Logged as{" "}
                <span className="text-white font-medium">
                  {form.firstName} {form.lastName}
                </span>{" "}
                · {form.email}
                {leadId && (
                  <span className="ml-2 text-green-400 text-xs">✓ Lead saved to CRM</span>
                )}
              </p>
            </div>
            {/* Calendly inline widget */}
            <div
              ref={calendlyRef}
              style={{ minWidth: "320px", height: "700px" }}
            />
          </div>
        )}

        {step === "done" && (
          <div className="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-green-500/40">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold">You&apos;re booked!</h2>
            <p className="mt-3 text-slate-400">
              We&apos;ve saved your details to our CRM and a calendar invite is on its way to{" "}
              <span className="text-white font-medium">{form.email}</span>.
            </p>
            <p className="mt-2 text-slate-400">We look forward to speaking with you.</p>
            <button
              onClick={() => {
                setStep("form");
                setForm({ firstName: "", lastName: "", email: "", phone: "", company: "" });
                setLeadId("");
              }}
              className="mt-8 rounded-xl bg-slate-700 px-6 py-2.5 text-sm font-medium hover:bg-slate-600 transition-colors"
            >
              Book another meeting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-blue-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
      />
    </div>
  );
}
