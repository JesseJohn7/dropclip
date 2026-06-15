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

  if (!url || typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
  }

  // Must be YouTube URL
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return NextResponse.json({ error: 'Not a YouTube URL.' }, { status: 400 })
  }

  // Check pro access
  const subscribed = email ? await checkSubscribed(email) : false

  if (!subscribed) {
    return NextResponse.json(
      { requiresSubscription: true, proOnly: true, platform: 'YouTube' },
      { status: 403 }
    )
  }

  // Call RapidAPI YTStream
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'YouTube service not configured.' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${encodeURIComponent(url)}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com',
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Could not fetch YouTube video.' }, { status: 502 })
    }

    const data = await response.json()

    // YTStream returns formats in data.formats
    // Pick best mp4 quality available
    const formats = data?.formats
    if (!formats) {
      return NextResponse.json({ error: 'No video formats found.' }, { status: 422 })
    }

    // Get all mp4 formats sorted by quality
    const mp4Formats = Object.values(formats as Record<string, any>)
      .filter((f: any) => f.mimeType?.includes('video/mp4') && f.url)
      .sort((a: any, b: any) => (parseInt(b.qualityLabel) || 0) - (parseInt(a.qualityLabel) || 0))

    const best = mp4Formats[0] as any

    if (!best?.url) {
      return NextResponse.json({ error: 'No downloadable video found.' }, { status: 422 })
    }

    const title = data.title
      ? `Clipio-YouTube-${data.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}`
      : `Clipio-YouTube-${Date.now()}`

    // Log to Supabase
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    await supabase
      .from('download_requests')
      .insert({ url, platform: 'YouTube', ip, status: 'success' })

    return NextResponse.json({
      downloadUrl: best.url,
      title,
      platform: 'YouTube',
      quality: best.qualityLabel ?? 'HD',
    })

  } catch (err: any) {
    console.error('YouTube API error:', err)
    return NextResponse.json({ error: 'Server error. Try again.' }, { status: 500 })
  }
}