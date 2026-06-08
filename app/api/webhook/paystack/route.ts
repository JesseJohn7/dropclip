import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// ✅ Fix 1: SERVICE_ROLE_KEY not ANON_KEY — needed to bypass RLS and write to the table
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    const email = event.data.customer.email?.toLowerCase().trim()
    const plan = event.data.metadata?.plan as 'monthly' | 'yearly' | undefined

    if (!email || !plan) {
      console.error('Webhook missing email or plan:', { email, plan })
      return NextResponse.json({ ok: true })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (plan === 'yearly' ? 365 : 30))

    // ✅ Fix 2: table name matches what download/route.ts reads from — 'subscribers'
    // ✅ Fix 3: upsert so Paystack webhook retries don't duplicate or crash
    const { error } = await supabase
      .from('subscribers')
      .upsert(
        {
          email,
          plan,
          paystack_reference: event.data.reference,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('Supabase upsert error:', error)
      // Return 500 so Paystack retries the webhook
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}