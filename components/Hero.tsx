'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Download, Link2, Loader2, CheckCircle, XCircle, Play, X, Clipboard, Crown, Zap } from 'lucide-react'
import Link from 'next/link'

const PLATFORMS = [
  { label: 'TikTok', domains: ['tiktok.com'], color: 'text-pink-400 border-pink-500/40 bg-pink-500/10', proOnly: false },
  { label: 'X (Twitter)', domains: ['twitter.com', 'x.com'], color: 'text-sky-400 border-sky-500/40 bg-sky-500/10', proOnly: false },
  { label: 'Instagram', domains: ['instagram.com'], color: 'text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-500/10', proOnly: false },
  { label: 'Facebook', domains: ['facebook.com', 'fb.watch'], color: 'text-blue-400 border-blue-500/40 bg-blue-500/10', proOnly: false },
]

type Status = 'idle' | 'loading' | 'success' | 'error'

function detectPlatform(url: string) {
  return PLATFORMS.find(p => p.domains.some(d => url.includes(d))) ?? null
}

function proxyUrl(raw: string) {
  return `/api/proxy?url=${encodeURIComponent(raw)}`
}

function isVideoUrl(val: string) {
  try {
    const u = new URL(val)
    return PLATFORMS.some(p => p.domains.some(d => u.hostname.includes(d)))
  } catch { return false }
}

function isLikelyCompleteEmail(val: string) {
  const i = val.indexOf('@')
  if (i < 1) return false
  const domain = val.slice(i + 1)
  return domain.includes('.') && domain.split('.').every(p => p.length > 0)
}

export default function Hero() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{
    downloadUrl: string
    title: string
    platform: string
    freeDownloadsRemaining?: number
  } | null>(null)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMp3Loading, setIsMp3Loading] = useState(false)
  const [mp3Error, setMp3Error] = useState('')
  const [clipboardSuggestion, setClipboardSuggestion] = useState('')
  const [showClipboardBanner, setShowClipboardBanner] = useState(false)
  const hasCheckedClipboard = useRef(false)

  // Subscription state
  const [email, setEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [emailNotFound, setEmailNotFound] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Free tier
  const [hitFreeLimit, setHitFreeLimit] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('clipio_email')
    if (saved) {
      setEmail(saved)
      setEmailInput(saved)
      silentVerify(saved)
    }
  }, [])

  const silentVerify = async (emailToCheck: string) => {
    if (!emailToCheck) return
    try {
      const res = await fetch(`/api/check-access?email=${encodeURIComponent(emailToCheck)}`)
      const data = await res.json()
      if (data.subscribed) {
        setIsSubscribed(true)
        setEmail(emailToCheck)
        localStorage.setItem('clipio_email', emailToCheck)
      } else {
        setIsSubscribed(false)
      }
    } catch {
      setIsSubscribed(false)
    }
  }

  const handleEmailInput = useCallback((val: string) => {
    setEmailInput(val)
    setIsVerifying(false)
    setEmailNotFound(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!isLikelyCompleteEmail(val)) return

    debounceRef.current = setTimeout(async () => {
      setIsVerifying(true)
      try {
        const res = await fetch(`/api/check-access?email=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        if (data.subscribed) {
          setEmail(val.trim())
          setIsSubscribed(true)
          setEmailNotFound(false)
          localStorage.setItem('clipio_email', val.trim())
          setShowEmailPrompt(false)
        } else {
          setIsSubscribed(false)
          setEmailNotFound(true)
        }
      } catch {
        setIsSubscribed(false)
        setEmailNotFound(false)
      } finally {
        setIsVerifying(false)
      }
    }, 600)
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('clipio_email')
    setEmail('')
    setEmailInput('')
    setIsSubscribed(false)
    setEmailNotFound(false)
  }

  const handleCloseEmailPrompt = () => {
    setShowEmailPrompt(false)
    setEmailNotFound(false)
  }

  useEffect(() => {
    const checkClipboard = async () => {
      if (hasCheckedClipboard.current) return
      if (!navigator.clipboard?.readText) return
      try {
        const text = await navigator.clipboard.readText()
        if (text && isVideoUrl(text.trim())) {
          setClipboardSuggestion(text.trim())
          setShowClipboardBanner(true)
          hasCheckedClipboard.current = true
        }
      } catch { }
    }

    checkClipboard()
    window.addEventListener('focus', checkClipboard)
    return () => window.removeEventListener('focus', checkClipboard)
  }, [])

  const handlePasteFromClipboard = () => {
    setUrl(clipboardSuggestion)
    setShowClipboardBanner(false)
    setError('')
  }

  const activePlatform = url ? detectPlatform(url) : null

  const isValidUrl = (val: string) => {
    try { new URL(val); return true } catch { return false }
  }

  const handleFetch = async () => {
    if (!url.trim() || !isValidUrl(url)) {
      setError('Please paste a valid video URL')
      return
    }

    setStatus('loading')
    setError('')
    setResult(null)
    setIsPlaying(false)
    setHitFreeLimit(false)
    setMp3Error('')

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email: email || undefined }),
      })
      const data = await res.json()

      if (data.requiresSubscription) {
        setStatus('error')
        setHitFreeLimit(!!data.freeLimit)
        setError('')
        return
      }

      if (!res.ok) throw new Error(data.error || 'Download failed')
      setResult(data)
      setStatus('success')
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  const handleReset = () => {
    setUrl('')
    setError('')
    setStatus('idle')
    setResult(null)
    setIsPlaying(false)
    setIsSaving(false)
    setIsMp3Loading(false)
    setHitFreeLimit(false)
    setMp3Error('')
    hasCheckedClipboard.current = false
  }

  const handleSaveVideo = () => {
    if (!result) return
    setIsSaving(true)
    const a = document.createElement('a')
    a.href = proxyUrl(result.downloadUrl)
    a.download = `${result.title ?? 'clipio-video'}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setIsSaving(false), 3000)
  }

  const handleMp3 = async () => {
    if (!result) return
    setIsMp3Loading(true)
    setMp3Error('')

    try {
      const res = await fetch('/api/mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email: email || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMp3Error(data.error || 'Could not extract audio. Try again.')
        return
      }

      const downloadUrl: string = data.downloadUrl

      if (!downloadUrl) {
        setMp3Error('No audio URL returned. Try again.')
        return
      }

      // ── Download trigger ──────────────────────────────────────────────
      // Do NOT proxy MP3 URLs — proxy is for video only and will hang.
      // Use a direct anchor click; fall back to window.open if blocked.
      const filename = `${data.title ?? 'clipio-audio'}.mp3`

      try {
        // Fetch the audio as a blob so the browser downloads instead of navigating
        const audioRes = await fetch(downloadUrl)
        if (!audioRes.ok) throw new Error('blob fetch failed')
        const blob = await audioRes.blob()
        const blobUrl = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        // Clean up blob URL after a short delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
      } catch {
        // Blob fetch failed (e.g. CORS) — fall back to direct link in new tab
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = filename
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

    } catch {
      setMp3Error('Failed to extract audio. Try again.')
    } finally {
      setIsMp3Loading(false)
    }
  }

  const needsUpgrade = status === 'error' && !error && !hitFreeLimit && !isSubscribed

  return (
    <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center bg-black px-4 pb-20 pt-32 overflow-hidden">

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[800px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* Badge */}
      <div className="mb-6 flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-xs font-medium text-violet-300 tracking-wide">
          3 free downloads daily · Pro for unlimited + MP3 extraction
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-center max-w-4xl leading-[1.05] mb-4">
        Download any video <br />
        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          from anywhere.
        </span>
      </h1>

      <p className="text-zinc-400 text-base md:text-lg text-center max-w-xl mb-8">
        Paste a link from TikTok, X, Instagram or Facebook — download video or extract MP3 with Pro.
      </p>

      {/* Subscription status bar */}
      <div className="w-full max-w-2xl mb-6">
        {isSubscribed ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-300 font-medium">Pro · {email}</span>
            </div>
            <button onClick={handleSignOut} className="text-xs text-zinc-500 hover:text-white transition">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
              <span className="text-xs text-zinc-400 leading-relaxed">
                3 free downloads/day · <span className="text-violet-400 font-medium">Pro from ₦1,000/month</span>
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => { setShowEmailPrompt(true); setEmailInput(email) }}
                className="flex-1 sm:flex-none text-xs font-semibold text-violet-300 hover:text-white border border-violet-500/30 hover:border-violet-400/60 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-2 sm:py-1.5 rounded-lg transition text-center"
              >
                I have a plan
              </button>
              <Link
                href="/pricing"
                className="flex-1 sm:flex-none text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-2 sm:py-1 rounded-lg transition text-center"
              >
                Get Pro
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Email prompt modal */}
      {showEmailPrompt && (
        <div className="w-full max-w-2xl mb-4 rounded-2xl border border-violet-500/30 bg-zinc-900/95 backdrop-blur px-5 py-4">
          <p className="text-sm font-semibold text-white mb-1">Enter your subscriber email</p>
          <p className="text-xs text-zinc-500 mb-3">Use the email you paid with on Paystack</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="email"
                placeholder="you@email.com"
                value={emailInput}
                onChange={e => handleEmailInput(e.target.value)}
                className={`w-full px-3 py-2 pr-8 rounded-xl bg-zinc-800 border text-white text-sm placeholder-zinc-600 focus:outline-none transition ${
                  emailNotFound
                    ? 'border-orange-500/60 focus:border-orange-500'
                    : 'border-zinc-700 focus:border-violet-500'
                }`}
                autoFocus
              />
              {isVerifying && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-400 animate-spin" />
              )}
            </div>
            <button
              onClick={handleCloseEmailPrompt}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 min-h-[1.25rem]">
            {emailNotFound ? (
              <p className="text-xs text-orange-400">
                No active subscription found.{' '}
                <Link href="/pricing" className="underline underline-offset-2 hover:text-orange-300 transition">
                  Get Pro →
                </Link>
                <span className="text-zinc-600 ml-2">or</span>
                <button
                  onClick={handleCloseEmailPrompt}
                  className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 ml-2 transition"
                >
                  continue free
                </button>
              </p>
            ) : isVerifying ? (
              <p className="text-xs text-zinc-500">Checking…</p>
            ) : (
              <p className="text-xs text-zinc-600">Verifying automatically as you type…</p>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="w-full max-w-2xl">

        {/* Clipboard banner */}
        {showClipboardBanner && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Clipboard className="h-4 w-4 text-violet-400 shrink-0" />
              <span className="text-xs text-violet-300 truncate">Video link copied — paste it?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePasteFromClipboard}
                className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-lg transition"
              >
                Paste
              </button>
              <button onClick={() => setShowClipboardBanner(false)} className="text-zinc-500 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className={`rounded-2xl border bg-zinc-900/80 backdrop-blur transition-all duration-300 ${
          status === 'error' && error
            ? 'border-red-500/60 shadow-red-500/10 shadow-lg'
            : 'border-zinc-700 focus-within:border-violet-500/60 focus-within:shadow-violet-500/10 focus-within:shadow-lg'
        }`}>
          <div className="flex items-center gap-3 px-3 py-3">
            {activePlatform ? (
              <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${activePlatform.color} transition-all duration-300`}>
                {activePlatform.label}
              </span>
            ) : (
              <Link2 className="h-5 w-5 text-zinc-500 shrink-0" />
            )}

            <input
              type="url"
              value={url}
              onChange={e => {
                setUrl(e.target.value)
                setError('')
                setHitFreeLimit(false)
                setMp3Error('')
                if (status === 'success') {
                  setStatus('idle')
                  setResult(null)
                  setIsPlaying(false)
                }
              }}
              onKeyDown={e => e.key === 'Enter' && status !== 'success' && handleFetch()}
              placeholder="Paste video URL…"
              className="flex-1 min-w-0 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
            />

            {url && (
              <button
                onClick={handleReset}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all duration-200"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {status !== 'success' && (
              <button
                onClick={handleFetch}
                disabled={status === 'loading' || !url.trim()}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 sm:px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />
                }
                <span className="hidden sm:block">
                  {status === 'loading' ? 'Fetching…' : 'Download'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Generic error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm px-1">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Free limit hit */}
        {hitFreeLimit && (
          <div className="mt-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-orange-400 shrink-0" />
              <p className="text-sm font-semibold text-white">You've used all 3 free downloads today</p>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Free downloads reset at midnight. Subscribe to Clipio Pro for unlimited downloads anytime.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-sm font-semibold text-white transition"
              >
                <Crown className="h-4 w-4" />
                Get Clipio Pro
              </Link>
              <button
                onClick={() => { setShowEmailPrompt(true); setEmailInput(email) }}
                className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-400/50 px-3 py-2 rounded-xl transition"
              >
                Already subscribed?
              </button>
            </div>
          </div>
        )}

        {/* Needs upgrade */}
        {needsUpgrade && (
          <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-white mb-1">Clipio Pro required</p>
            <p className="text-xs text-zinc-400 mb-3">
              Subscribe for ₦1,000/month or ₦10,000/year to unlock unlimited downloads.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-sm font-semibold text-white transition"
              >
                <Crown className="h-4 w-4" />
                Get Clipio Pro
              </Link>
              <button
                onClick={() => { setShowEmailPrompt(true); setEmailInput(email) }}
                className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-xl transition"
              >
                I have a subscription
              </button>
            </div>
          </div>
        )}

        {/* Free downloads remaining */}
        {status === 'success' && result && typeof result.freeDownloadsRemaining === 'number' && (
          <div className="mt-2 flex items-center gap-2 px-1">
            <Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <span className="text-xs text-zinc-500">
              {result.freeDownloadsRemaining === 0
                ? 'Last free download used today. '
                : `${result.freeDownloadsRemaining} free download${result.freeDownloadsRemaining === 1 ? '' : 's'} left today. `}
              <Link href="/pricing" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition">
                Go unlimited with Pro →
              </Link>
            </span>
          </div>
        )}

        {/* Success Preview Card */}
        {status === 'success' && result && (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-2xl shadow-violet-500/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-medium text-white truncate">{result.title}</span>
              </div>
              {(() => {
                const p = PLATFORMS.find(p => p.label === result.platform)
                return p ? (
                  <span className={`shrink-0 ml-3 text-xs font-semibold px-2.5 py-1 rounded-full border ${p.color}`}>
                    {result.platform}
                  </span>
                ) : null
              })()}
            </div>

            <div className="relative bg-black">
              {!isPlaying ? (
                <div
                  className="relative flex items-center justify-center h-64 md:h-80 bg-zinc-950 cursor-pointer group"
                  onClick={() => setIsPlaying(true)}
                >
                  <div className="absolute inset-0 overflow-hidden">
                    <video
                      src={proxyUrl(result.downloadUrl)}
                      className="w-full h-full object-cover blur-xl opacity-30 scale-110"
                      muted
                      preload="metadata"
                    />
                  </div>
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
                      <Play className="h-7 w-7 text-white fill-white ml-1" />
                    </div>
                    <span className="text-zinc-400 text-xs">Click to preview</span>
                  </div>
                </div>
              ) : (
                <video
                  src={proxyUrl(result.downloadUrl)}
                  controls
                  autoPlay
                  className="w-full max-h-80 bg-black object-contain"
                  preload="auto"
                  onError={() => setIsPlaying(false)}
                />
              )}
            </div>

            {/* Download buttons */}
            <div className="px-4 py-4 flex flex-col gap-2">
              <button
                onClick={handleSaveVideo}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 py-3 text-sm font-semibold text-white transition disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Downloading…</>
                ) : (
                  <><Download className="h-4 w-4" />Download Video</>
                )}
              </button>

              {/* MP3 button */}
              {isSubscribed ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleMp3}
                    disabled={isMp3Loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 py-3 text-sm font-semibold text-violet-300 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMp3Loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Extracting audio…</>
                    ) : (
                      <>🎵 Download MP3</>
                    )}
                  </button>
                  {mp3Error && (
                    <div className="flex items-center gap-1.5 px-1">
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="text-xs text-red-400">{mp3Error}</span>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/pricing"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 hover:border-violet-500/40 py-3 text-sm font-semibold text-zinc-500 hover:text-white transition"
                >
                  <Crown className="h-4 w-4" />
                  MP3 Extract — Pro only
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Platform chips */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
        {PLATFORMS.map(p => {
          const isActive = activePlatform?.label === p.label
          return (
            <span
              key={p.label}
              className={`px-4 py-2 rounded-full border text-xs font-medium transition-all duration-300 cursor-default ${
                isActive ? p.color : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
              }`}
            >
              {p.label}
            </span>
          )
        })}
      </div>
    </section>
  )
}