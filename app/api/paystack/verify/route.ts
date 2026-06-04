import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role here — server only
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(new URL("/pricing?error=no_reference", req.url));
  }

  // Verify with Paystack
  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const paystackData = await paystackRes.json();

  if (!paystackData.status || paystackData.data.status !== "success") {
    return NextResponse.redirect(new URL("/pricing?error=payment_failed", req.url));
  }

  const { email, plan } = paystackData.data.metadata;
  const now = new Date();
  const expiresAt = new Date(now);

  if (plan === "monthly") {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  // Upsert subscriber in Supabase
  const { error } = await supabase.from("subscribers").upsert(
    {
      email,
      plan,
      paystack_reference: reference,
      status: "active",
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.redirect(new URL("/pricing?error=db_error", req.url));
  }

  // Redirect to success page with email
  return NextResponse.redirect(
    new URL(`/success?email=${encodeURIComponent(email)}`, req.url)
  );
}