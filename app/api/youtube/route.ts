import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRO_EMAILS = ['jessejohn260@gmail.com']

async function checkSubscribed(email: string): Promise<boolean> {
  if (PRO_EMAILS.includes(email.toLowerCase().trim())) return true
  const { data } = await supabase
    .from('subscribers')
    .select('expires_at, status')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'active')
    .maybeSingle()
  if (!data) return false
  return new Date(data.expires_at) > new Date()
}

export async function POST(req: NextRequest) {
  let body: { url?: string; email?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { url, email } = body

  if (!url || !url.trim()) {
    return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
  }

  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return NextResponse.json({ error: 'Not a YouTube URL.' }, { status: 400 })
  }

  // Pro check
  const subscribed = email ? await checkSubscribed(email) : false
  if (!subscribed) {
    return NextResponse.json(
      { requiresSubscription: true, proOnly: true, platform: 'YouTube' },
      { status: 403 }
    )
  }

  // Call your Railway yt-dlp backend
  const YTDLP_API = process.env.YTDLP_API_URL
  if (!YTDLP_API) {
    return NextResponse.json({ error: 'YouTube service not configured.' }, { status: 500 })
  }

  try {
    const res = await fetch(`${YTDLP_API}/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Could not fetch video.' }, { status: 502 })
    }

    // Log to Supabase
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    await supabase.from('download_requests').insert({ url, platform: 'YouTube', ip, status: 'success' })

    return NextResponse.json({
      downloadUrl: data.downloadUrl,
      title: `Clipio-YouTube-${data.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}`,
      platform: 'YouTube',
    })

  } catch (err: any) {
    console.error('YouTube error:', err)
    return NextResponse.json({ error: 'Server error. Try again.' }, { status: 500 })
  }
}