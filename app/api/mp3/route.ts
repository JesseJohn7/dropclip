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

  // Pro only
  const subscribed = email ? await checkSubscribed(email) : false
  if (!subscribed) {
    return NextResponse.json(
      { requiresSubscription: true, proOnly: true, platform: 'MP3' },
      { status: 403 }
    )
  }

  const COBALT_URL = process.env.COBALT_API_URL
  if (!COBALT_URL) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 500 })
  }

  try {
    const cobaltRes = await fetch(`${COBALT_URL}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        url,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '320',
        filenameStyle: 'pretty',
      }),
    })

    const data = await cobaltRes.json()

    if (data.status === 'error') {
      return NextResponse.json(
        { error: 'Could not extract audio. Make sure the link is public.' },
        { status: 422 }
      )
    }

    const downloadUrl = data.url
    if (!downloadUrl) {
      return NextResponse.json({ error: 'No audio link returned.' }, { status: 422 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    await supabase.from('download_requests').insert({ url, platform: 'MP3', ip, status: 'success' })

    return NextResponse.json({
      downloadUrl,
      title: `Clipio-Audio-${Date.now()}`,
      platform: 'MP3',
      isAudio: true,
    })

  } catch (err: any) {
    console.error('MP3 error:', err)
    return NextResponse.json({ error: 'Server error. Try again.' }, { status: 500 })
  }
}