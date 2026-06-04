import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function detectPlatform(url: string) {
  if (url.includes('tiktok.com')) return 'TikTok'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'X (Twitter)'
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook'
  if (url.includes('instagram.com')) return 'Instagram'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
  return 'Unknown'
}

function buildFilename(platform: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `Clipio-${platform}-${timestamp}.mp4`
}

async function isSubscribed(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('subscribers')
    .select('expires_at, status')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'active')
    .single()

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

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
  }

  // --- Subscription gate ---
  if (!email || !(await isSubscribed(email))) {
    return NextResponse.json(
      { error: 'A Clipio Pro subscription is required to download.', requiresSubscription: true },
      { status: 403 }
    )
  }

  const platform = detectPlatform(url)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const { data: insertedRow, error: insertError } = await supabase
    .from('download_requests')
    .insert({ url, platform, ip, status: 'pending' })
    .select('id')
    .single()

  if (insertError) console.error('Supabase insert error:', insertError)

  const rowId = insertedRow?.id

  const updateStatus = async (status: 'success' | 'failed') => {
    if (!rowId) return
    await supabase.from('download_requests').update({ status }).eq('id', rowId)
  }

  const COBALT_URL = process.env.COBALT_API_URL
  if (!COBALT_URL) {
    return NextResponse.json({ error: 'Cobalt API not configured.' }, { status: 500 })
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
        videoQuality: 'max',
        filenameStyle: 'pretty',
        tiktokFullAudio: false,
      }),
    })

    if (!cobaltRes.ok) {
      const text = await cobaltRes.text()
      console.error('Cobalt non-200:', cobaltRes.status, text)
      await updateStatus('failed')
      return NextResponse.json(
        { error: 'Could not reach download service. Try again.' },
        { status: 502 }
      )
    }

    const data = await cobaltRes.json()

    if (data.status === 'error') {
      await updateStatus('failed')
      return NextResponse.json(
        { error: data.error?.code ?? 'Could not extract video. Make sure the link is public.' },
        { status: 422 }
      )
    }

    let downloadUrl: string | undefined

    if (data.status === 'picker') {
      const firstVideo = data.picker?.find((item: any) => item.type === 'video') ?? data.picker?.[0]
      downloadUrl = firstVideo?.url
    } else {
      downloadUrl = data.url
    }

    if (!downloadUrl) {
      await updateStatus('failed')
      return NextResponse.json({ error: 'No download link returned.' }, { status: 422 })
    }

    await updateStatus('success')

    return NextResponse.json({ downloadUrl, title: buildFilename(platform), platform })
  } catch (err: any) {
    console.error('Download error:', err)
    await updateStatus('failed')
    return NextResponse.json({ error: 'Server error. Try again.' }, { status: 500 })
  }
}