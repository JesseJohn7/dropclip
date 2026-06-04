import { NextRequest, NextResponse } from "next/server";
import { isSubscribed } from "@/lib/checkSubscription";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ subscribed: false });

  const subscribed = await isSubscribed(email);
  return NextResponse.json({ subscribed });
}