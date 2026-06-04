import { NextRequest, NextResponse } from "next/server";

const PLANS = {
  monthly: 100000, // ₦1,000 in kobo
  yearly: 1000000, // ₦10,000 in kobo
};

export async function POST(req: NextRequest) {
  const { email, plan } = await req.json();

  if (!email || !plan || !PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const amount = PLANS[plan as keyof typeof PLANS];
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify`;

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount,
      callback_url: callbackUrl,
      metadata: { plan, email },
    }),
  });

  const data = await response.json();

  if (!data.status) {
    return NextResponse.json({ error: "Paystack error" }, { status: 500 });
  }

  return NextResponse.json({
    authorization_url: data.data.authorization_url,
    reference: data.data.reference,
  });
}