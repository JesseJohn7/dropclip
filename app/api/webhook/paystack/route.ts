import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  const signature = req.headers.get('x-paystack-signature')
  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const email = event.data.customer.email
    const plan = event.data.metadata?.plan as 'monthly' | 'yearly'
    if (!plan) return NextResponse.json({ ok: true })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (plan === 'yearly' ? 365 : 30))

    await supabase.from('subscriptions').insert({
      email,
      plan,
      paystack_reference: event.data.reference,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    })
  }

  return NextResponse.json({ ok: true })
}