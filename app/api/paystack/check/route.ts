import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) return NextResponse.json({ active: false })

  const { data } = await supabase
    .from('subscriptions')
    .select('expires_at, plan')
    .eq('email', email)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return NextResponse.json({ active: false })

  const isActive = new Date(data.expires_at) > new Date()
  return NextResponse.json({
    active: isActive,
    plan: data.plan,
    expires_at: data.expires_at,
  })
}