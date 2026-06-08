import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRO_EMAILS = [
  'jessejohn260@gmail.com',
  'olaojosuccess@gmail.com', // manually granted pro access
]

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim()
  if (!email) return NextResponse.json({ subscribed: false })

  // Hardcoded bypass for pro emails
  if (PRO_EMAILS.includes(email)) {
    return NextResponse.json({ subscribed: true })
  }

  const { data, error } = await supabase
    .from('subscribers')
    .select('id, status')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    console.error('check-access error:', error)
    return NextResponse.json({ subscribed: false })
  }

  return NextResponse.json({ subscribed: !!data })
}
