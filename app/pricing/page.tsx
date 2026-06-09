"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Zap, Check, Shield } from "lucide-react";

const PLANS = {
  monthly: { amount: 100000, label: "₦1,000/month", price: "₦1,000", period: "month", description: "Billed monthly" },
  yearly: { amount: 1000000, label: "₦10,000/year", price: "₦10,000", period: "year", description: "Save 2 months free" },
};

const FEATURES = [
  "Unlimited downloads per day",
  "TikTok, X, Instagram & Facebook",
  "Full quality video",
  "No watermarks",
  "Priority support",
];

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });

      const data = await res.json();

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setError("Failed to initialize payment. Try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-20 overflow-hidden">

      {/* Background glow — matches hero */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[800px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </Link>
      </div>

      {/* Header */}
      <div className="relative flex flex-col items-center mb-10 text-center">
        <div className="mb-4 flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5">
          <Crown className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-violet-300 tracking-wide">Clipio Pro</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">
          Unlimited downloads,{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            no limits.
          </span>
        </h1>
        <p className="text-zinc-400 text-base max-w-sm">
          One subscription unlocks everything — every platform, every video, every day.
        </p>
      </div>

      {/* Plan Toggle */}
      <div className="relative flex gap-3 mb-8 p-1 rounded-2xl border border-zinc-800 bg-zinc-900/60">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={`relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
              plan === p
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div>{PLANS[p].price}<span className="font-normal text-xs opacity-80">/{PLANS[p].period}</span></div>
            <div className={`text-xs font-normal mt-0.5 ${plan === p ? "text-violet-200" : "text-zinc-600"}`}>
              {PLANS[p].description}
            </div>
            {p === "yearly" && (
              <span className={`absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                plan === "yearly"
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}>
                SAVE
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur overflow-hidden shadow-2xl shadow-violet-500/5">
        {/* Card gradient top strip */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500" />

        <div className="px-6 py-6">
          {/* Features */}
          <ul className="space-y-2.5 mb-6">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 shrink-0">
                  <Check className="h-3 w-3 text-violet-400" />
                </div>
                <span className="text-sm text-zinc-300">{f}</span>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="h-px bg-zinc-800 mb-6" />

          {/* Email Input */}
          <div className="mb-3">
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Your email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs mb-3 flex items-center gap-1.5">
              <Zap className="h-3 w-3 shrink-0" />
              {error}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm text-white transition-all shadow-lg shadow-violet-500/20"
          >
            {loading ? "Redirecting…" : `Pay ${PLANS[plan].label}`}
          </button>

          {/* Trust line */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <p className="text-zinc-600 text-xs">Secured by Paystack · Cancel anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
}