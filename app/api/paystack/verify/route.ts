import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference')

  if (!reference) {
    return NextResponse.redirect(`https://clipio-tau.vercel.app/?error=missing`)
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  const data = await response.json()

  if (!data.status || data.data.status !== 'success') {
    return NextResponse.redirect(`https://clipio-tau.vercel.app/?error=failed`)
  }

  const email = data.data.customer.email
  const plan = data.data.metadata.plan as 'monthly' | 'yearly'
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (plan === 'yearly' ? 365 : 30))

  await supabase.from('subscriptions').insert({
    email,
    plan,
    paystack_reference: reference,
    status: 'active',
    expires_at: expiresAt.toISOString(),
  })

  return NextResponse.redirect(
    `https://clipio-tau.vercel.app/?paid=true&email=${encodeURIComponent(email)}`
  )
}