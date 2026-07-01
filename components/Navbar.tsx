'use client'

import Link from 'next/link'
import { Crown, ChevronRight } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/50 bg-black backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8 lg:px-12">

        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-1 transition-all duration-300"
        >
          <span className="text-xl font-black tracking-tight text-white">
            Clipio
          </span>
        </Link>

        {/* Get Pro Button */}
        <Link
          href="/pricing"
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition-all duration-300 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-violet-500/30"
        >
          <Crown className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          <span className="hidden sm:block">Get Clipio Pro</span>
          <span className="sm:hidden">Pro</span>
          <ChevronRight className="h-4 w-4 opacity-70 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </header>
  )
}