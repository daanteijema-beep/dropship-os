'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2, Rocket, Globe, Megaphone, Video,
  Copy, Check, ExternalLink, ChevronDown, ChevronUp, Camera
} from 'lucide-react'

type Product = {
  id: string; name: string; cjPrice: string; retailPrice: string
  margin: string; soldCount: number; trendScore: number; winReason: string
  source: string; image?: string; category?: string
}

type LaunchData = {
  landingPage: string
  metaAd: string
  tiktokScript: string
  instagramCaption: string
  competitorDataFound: boolean
}

function Section({ icon, title, content, isHtml = false }: {
  icon: React.ReactNode; title: string; content: string; isHtml?: boolean
}) {
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          {icon} {title}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); copy() }}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          {open ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-zinc-800">
          {isHtml ? (
            <div className="mt-3">
              <div className="mb-2 text-xs text-zinc-500">Preview:</div>
              <div
                className="bg-white rounded-lg p-4 text-sm overflow-auto max-h-80"
                dangerouslySetInnerHTML={{ __html: content }}
              />
              <details className="mt-3">
                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">HTML code tonen</summary>
                <pre className="mt-2 text-xs text-zinc-400 whitespace-pre-wrap overflow-auto max-h-60 bg-zinc-950 rounded p-3">{content}</pre>
              </details>
            </div>
          ) : (
            <pre className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
          )}
        </div>
      )}
    </div>
  )
}

function LaunchContent() {
  const params = useSearchParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<LaunchData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const encoded = params.get('product')
    if (encoded) {
      try { setProduct(JSON.parse(decodeURIComponent(encoded))) } catch { /* ignore */ }
    }
  }, [params])

  async function launch() {
    if (!product) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, competitorUrl: competitorUrl.trim() || undefined, generate: 'all' }),
      })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setData(json)
    } catch {
      setError('Launch mislukt')
    } finally {
      setLoading(false)
    }
  }

  if (!product) {
    return (
      <div className="text-center py-20 text-zinc-600">
        <Rocket size={40} className="mx-auto mb-3 opacity-30" />
        <p>Selecteer een product via de Research pagina</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Product card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-5">
        {product.image && (
          <img src={product.image} alt={product.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-white">{product.name}</h3>
          <p className="text-sm text-zinc-400 mt-0.5">{product.winReason}</p>
          <div className="flex gap-4 mt-2 text-xs text-zinc-500">
            <span>Inkoop: <span className="text-zinc-300">${product.cjPrice}</span></span>
            <span>Verkoop: <span className="text-zinc-300">{product.retailPrice}</span></span>
            <span>Marge: <span className="text-emerald-400">{product.margin}</span></span>
            <span className="text-yellow-400">★ {product.trendScore}/10</span>
          </div>
        </div>
      </div>

      {/* Competitor URL */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={competitorUrl}
            onChange={e => setCompetitorUrl(e.target.value)}
            placeholder="Competitor URL (optioneel) — bijv. bol.com productpagina"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <button
          onClick={launch}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
          {loading ? 'Genereren...' : 'Launch Studio'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-zinc-500">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" />
          <p className="text-sm">AI genereert landingspagina + alle marketing content...</p>
          <p className="text-xs mt-1 text-zinc-600">Dit duurt ~15 seconden</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {data.competitorDataFound && (
            <p className="text-xs text-emerald-400">✓ Competitor data gebruikt voor betere content</p>
          )}
          <Section
            icon={<Globe size={14} className="text-blue-400" />}
            title="Landingspagina HTML"
            content={data.landingPage}
            isHtml
          />
          <Section
            icon={<Megaphone size={14} className="text-purple-400" />}
            title="Meta Ads (3 varianten)"
            content={data.metaAd}
          />
          <Section
            icon={<Video size={14} className="text-red-400" />}
            title="TikTok Script"
            content={data.tiktokScript}
          />
          <Section
            icon={<Camera size={14} className="text-pink-400" />}
            title="Instagram Caption"
            content={data.instagramCaption}
          />
        </div>
      )}
    </div>
  )
}

export default function LaunchPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Launch Studio</h2>
        <p className="text-zinc-400 mt-1">1 product → landingspagina + Meta ads + TikTok + Instagram</p>
      </div>
      <Suspense fallback={<div className="text-zinc-500 text-sm">Laden...</div>}>
        <LaunchContent />
      </Suspense>
    </div>
  )
}
