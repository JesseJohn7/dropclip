import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://clipio.online'),
  title: {
    default: 'Clipio — Free Video Downloader for TikTok, Instagram, Facebook & X',
    template: '%s | Clipio',
  },
  description:
    'Download TikTok, Instagram, Facebook, and X (Twitter) videos for free in full HD quality. No watermark, no sign-up needed. Fast, easy, and free video downloader online.',
  keywords: [
    'video downloader',
    'tiktok downloader',
    'tiktok video downloader',
    'download tiktok without watermark',
    'instagram video downloader',
    'download instagram reels',
    'facebook video downloader',
    'x video downloader',
    'twitter video downloader',
    'free video downloader online',
    'download videos online',
    'social media video downloader',
    'clipio',
  ],
  authors: [{ name: 'Clipio', url: 'https://clipio.online' }],
  creator: 'Clipio',
  publisher: 'Clipio',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://clipio.online',
    siteName: 'Clipio',
    title: 'Clipio — Free Video Downloader for TikTok, Instagram, Facebook & X',
    description:
      'Download TikTok, Instagram, Facebook, and X videos for free in full HD quality. No watermark. No sign-up.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Clipio — Free Video Downloader',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clipio — Free Video Downloader',
    description:
      'Download TikTok, Instagram, Facebook & X videos for free in full HD. No watermark.',
    images: ['/og-image.png'],
    creator: '@Jesse_can_code',
    site: '@Jesse_can_code',
  },
  alternates: {
    canonical: 'https://clipio.online',
  },
  verification: {
    // Paste your Google Search Console verification code here in Step 5
    google: 'PASTE_YOUR_GOOGLE_VERIFICATION_CODE_HERE',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Clipio',
              url: 'https://clipio.online',
              description:
                'Free online video downloader for TikTok, Instagram, Facebook and X (Twitter). Download videos in full HD quality with no watermark.',
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript',
              offers: [
                {
                  '@type': 'Offer',
                  name: 'Free Plan',
                  price: '0',
                  priceCurrency: 'NGN',
                  description: '3 free video downloads per day',
                },
                {
                  '@type': 'Offer',
                  name: 'Clipio Pro Monthly',
                  price: '1000',
                  priceCurrency: 'NGN',
                  description: 'Unlimited downloads per month',
                },
                {
                  '@type': 'Offer',
                  name: 'Clipio Pro Yearly',
                  price: '10000',
                  priceCurrency: 'NGN',
                  description: 'Unlimited downloads per year',
                },
              ],
              featureList: [
                'Download TikTok videos without watermark',
                'Download Instagram Reels',
                'Download Facebook videos',
                'Download X (Twitter) videos',
                'Full HD quality downloads',
                'No sign-up required for free tier',
              ],
            }),
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}