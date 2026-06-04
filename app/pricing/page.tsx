"use client";
import { useState } from "react";

const PLANS = {
  monthly: { amount: 100000, label: "₦1,000/month", description: "Billed monthly" },
  yearly: { amount: 1000000, label: "₦10,000/year", description: "Save 2 months free" },
};

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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-2">Clipio Pro</h1>
      <p className="text-gray-400 mb-10">Unlimited downloads. No limits.</p>

      {/* Plan Toggle */}
      <div className="flex gap-4 mb-8">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              plan === p
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <div>{PLANS[p].label}</div>
            <div className="text-xs font-normal mt-0.5">{PLANS[p].description}</div>
          </button>
        ))}
      </div>

      {/* Email Input */}
      <div className="w-full max-w-sm mb-4">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full max-w-sm py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold transition-all"
      >
        {loading ? "Redirecting..." : `Pay ${PLANS[plan].label}`}
      </button>

      <p className="text-gray-500 text-xs mt-6">Secured by Paystack · Cancel anytime</p>
    </div>
  );
}