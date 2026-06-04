"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function SuccessContent() {
  const params = useSearchParams();
  const email = params.get("email");

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-6">🎉</div>
      <h1 className="text-3xl font-bold mb-3">You're all set!</h1>
      <p className="text-gray-400 mb-2">
        Payment confirmed for <span className="text-white font-medium">{email}</span>
      </p>
      <p className="text-gray-500 text-sm mb-10">
        Your subscription is now active. Enjoy unlimited downloads!
      </p>
      <Link
        href="/"
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all"
      >
        Start Downloading
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}