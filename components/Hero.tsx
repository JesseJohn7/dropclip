'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, Link2, Loader2, CheckCircle, XCircle, Play, X, Clipboard } from 'lucide-react'

const PLATFORMS = [
  { label: 'TikTok', domains: ['tiktok.com'], color: 'text-pink-400 border-pink-500/40 bg-pink-500/10' },
  { label: 'X (Twitter)', domains: ['twitter.com', 'x.com'], color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
  { label: 'Instagram', domains: ['instagram.com'], color: 'text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-500/10' },
  { label: 'Facebook', domains: ['facebook.com', 'fb.watch'], color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
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

export default function Hero() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{ downloadUrl: string; title: string; platform: string } | null>(null)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [clipboardSuggestion, setClipboardSuggestion] = useState('')
  const [showClipboardBanner, setShowClipboardBanner] = useState(false)
  const hasCheckedClipboard = useRef(false)

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

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
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
    hasCheckedClipboard.current = false
  }

  const handleSaveVideo = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = proxyUrl(result.downloadUrl)
    a.download = `${result.title ?? 'clipio-video'}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

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
          Free · No signup needed · Instant downloads
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-center max-w-4xl leading-[1.05] mb-4">
        Download any video <br />
        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          from anywhere.
        </span>
      </h1>

      <p className="text-zinc-400 text-base md:text-lg text-center max-w-xl mb-12">
        Paste a link from TikTok, X, Facebook, Instagram and download instantly in full quality.
      </p>

      {/* Search Bar */}
      <div className="w-full max-w-2xl">

        {/* Clipboard banner */}
        {showClipboardBanner && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Clipboard className="h-4 w-4 text-violet-400 shrink-0" />
              <span className="text-xs text-violet-300 truncate">
                Video link copied — paste it?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePasteFromClipboard}
                className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-lg transition"
              >
                Paste
              </button>
              <button
                onClick={() => setShowClipboardBanner(false)}
                className="text-zinc-500 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className={`rounded-2xl border bg-zinc-900/80 backdrop-blur transition-all duration-300 ${
          status === 'error'
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

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm px-1">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Success Preview Card */}
        {status === 'success' && result && (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-2xl shadow-violet-500/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-medium text-white truncate">
                  {result.title}
                </span>
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

            <div className="px-4 py-4">
              <button
                onClick={handleSaveVideo}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 py-3 text-sm font-semibold text-white transition"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
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