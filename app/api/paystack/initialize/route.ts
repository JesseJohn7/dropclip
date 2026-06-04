import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, plan } = await req.json()

  if (!email || !plan) {
    return NextResponse.json({ error: 'Missing email or plan' }, { status: 400 })
  }

  const amount = plan === 'yearly' ? 1000000 : 100000

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount,
      currency: 'NGN',
      metadata: { plan },
      callback_url: `https://clipio-tau.vercel.app/api/paystack/verify`,
    }),
  })

  const data = await response.json()

  if (!data.status) {
    return NextResponse.json({ error: data.message }, { status: 400 })
  }

  return NextResponse.json({
    url: data.data.authorization_url,
    reference: data.data.reference,
  })
}