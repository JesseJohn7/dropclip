import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRO_EMAILS = ['jessejohn260@gmail.com']
const FREE_LIMIT = 3

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

async function checkAndIncrementFree(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('free_downloads')
    .select('count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  const currentCount = data?.count ?? 0

  if (currentCount >= FREE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  await supabase
    .from('free_downloads')
    .upsert(
      { ip, date: today, count: currentCount + 1 },
      { onConflict: 'ip,date' }
    )

  return { allowed: true, remaining: FREE_LIMIT - (currentCount + 1) }
}

async function fetchFromCobalt(url: string): Promise<{ ok: true; downloadUrl: string } | { ok: false; error: string; status: number }> {
  const COBALT_URL = process.env.COBALT_API_URL
  if (!COBALT_URL) {
    return { ok: false, error: 'Cobalt API not configured.', status: 500 }
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
      return { ok: false, error: 'Could not reach download service. Try again.', status: 502 }
    }

    const data = await cobaltRes.json()

    if (data.status === 'error') {
      return {
        ok: false,
        error: data.error?.code ?? 'Could not extract video. Make sure the link is public.',
        status: 422,
      }
    }

    let downloadUrl: string | undefined

    if (data.status === 'picker') {
      const firstVideo = data.picker?.find((item: any) => item.type === 'video') ?? data.picker?.[0]
      downloadUrl = firstVideo?.url
    } else {
      downloadUrl = data.url
    }

    if (!downloadUrl) {
      return { ok: false, error: 'No download link returned.', status: 422 }
    }

    return { ok: true, downloadUrl }
  } catch (err: any) {
    console.error('Cobalt fetch error:', err)
    return { ok: false, error: 'Server error. Try again.', status: 500 }
  }
}

async function logDownload(url: string, platform: string, ip: string) {
  const { error } = await supabase
    .from('download_requests')
    .insert({ url, platform, ip, status: 'success' })
  if (error) console.error('Supabase log error:', error)
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

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const platform = detectPlatform(url)

  // Check if pro subscriber
  const subscribed = email ? await checkSubscribed(email) : false

  // If not subscribed, check and consume a free download
  if (!subscribed) {
    const { allowed, remaining } = await checkAndIncrementFree(ip)

    if (!allowed) {
      return NextResponse.json(
        { requiresSubscription: true, freeLimit: true },
        { status: 403 }
      )
    }

    const cobaltResult = await fetchFromCobalt(url)

    if (!cobaltResult.ok) {
      // Undo the increment so the failed attempt doesn't cost them a free download
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('free_downloads')
        .select('count')
        .eq('ip', ip)
        .eq('date', today)
        .maybeSingle()
      if (data && data.count > 0) {
        await supabase
          .from('free_downloads')
          .upsert({ ip, date: today, count: data.count - 1 }, { onConflict: 'ip,date' })
      }
      return NextResponse.json({ error: cobaltResult.error }, { status: cobaltResult.status })
    }

    await logDownload(url, platform, ip)

    return NextResponse.json({
      downloadUrl: cobaltResult.downloadUrl,
      title: buildFilename(platform),
      platform,
      freeDownloadsRemaining: remaining,
    })
  }

  // Pro user — unlimited
  const cobaltResult = await fetchFromCobalt(url)

  if (!cobaltResult.ok) {
    return NextResponse.json({ error: cobaltResult.error }, { status: cobaltResult.status })
  }

  await logDownload(url, platform, ip)

  return NextResponse.json({
    downloadUrl: cobaltResult.downloadUrl,
    title: buildFilename(platform),
    platform,
  })
}