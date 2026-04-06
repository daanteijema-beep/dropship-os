'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, TrendingUp, Loader2, Star, ShoppingCart, Zap, Rocket } from 'lucide-react'

type Product = {
  id: string
  name: string
  cjPrice: string
  retailPrice: string
  margin: string
  soldCount: number
  trendScore: number
  winReason: string
  source: string
  image?: string
  category?: string
}

type TrendsData = { score: number; context: string }
type AmazonProduct = { name: string; price?: string | number; rating?: number; reviews?: number; url?: string }

function ResearchContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [amazonProducts, setAmazonProducts] = useState<AmazonProduct[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const kw = params.get('keyword')
    if (kw) {
      setKeyword(kw)
    }
  }, [params])

  function launchProduct(p: Product) {
    router.push(`/dashboard/launch?product=${encodeURIComponent(JSON.stringify(p))}`)
  }

  async function runResearch() {
    if (!keyword.trim()) return
    setLoading(true)
    setError('')
    setProducts([])
    setTrends(null)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setProducts(data.products || [])
      setTrends(data.trends || null)
      setAmazonProducts(data.amazonProducts || [])
    } catch {
      setError('Research mislukt — check console')
    } finally {
      setLoading(false)
    }
  }

  const topPicks = products.filter(p => p.trendScore >= 8)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Product Research</h2>
        <p className="text-zinc-400 mt-1">AI agent combineert CJ Dropshipping + Google Trends → winnende producten</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runResearch()}
            placeholder="bijv. posture corrector, red light therapy, massage gun..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <button
          onClick={runResearch}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
          {loading ? 'Analyseer...' : 'Analyseer'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Trends banner */}
      {trends && (
        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-zinc-500 mb-0.5">Google Trends NL — {keyword}</p>
            <p className="text-sm text-white">{trends.context}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400">{trends.score}</div>
            <div className="text-xs text-zinc-500">/100 interesse</div>
          </div>
          <div className="w-24 bg-zinc-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${trends.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Amazon reference panel */}
      {amazonProducts.length > 0 && (
        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Amazon.com — marktbewijs voor &quot;{keyword}&quot;</p>
          <div className="space-y-1.5">
            {amazonProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-600 w-4">{i + 1}.</span>
                <span className="flex-1 text-zinc-300 truncate">{p.name}</span>
                {p.price && <span className="text-zinc-500 flex-shrink-0">${p.price}</span>}
                {p.rating && <span className="text-yellow-500 flex-shrink-0">{p.rating}★</span>}
                {p.reviews && <span className="text-zinc-600 flex-shrink-0">{p.reviews.toLocaleString()} reviews</span>}
                {p.url && <a href={p.url} target="_blank" className="text-zinc-600 hover:text-zinc-400 flex-shrink-0">↗</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top picks */}
      {topPicks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-yellow-400" />
            <p className="text-sm font-medium text-yellow-400">Top picks ({topPicks.length})</p>
          </div>
          <div className="space-y-2">
            {topPicks.map((p, i) => <ProductRow key={i} p={p} highlight onLaunch={launchProduct} />)}
          </div>
        </div>
      )}

      {/* All results */}
      {products.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">{products.length} producten — gesorteerd op win score</p>
          {products.filter(p => p.trendScore < 8).map((p, i) => <ProductRow key={i} p={p} onLaunch={launchProduct} />)}
        </div>
      )}

      {products.length === 0 && !loading && !error && (
        <div className="text-center py-20 text-zinc-600">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p>Voer een keyword in en klik op Analyseer</p>
          <p className="text-xs mt-2 opacity-60">De AI agent haalt CJ producten op + Google Trends data</p>
        </div>
      )}
    </div>
  )
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Laden...</div>}>
      <ResearchContent />
    </Suspense>
  )
}

function ProductRow({ p, highlight = false, onLaunch }: { p: Product; highlight?: boolean; onLaunch: (p: Product) => void }) {
  return (
    <div className={`border rounded-xl p-4 flex items-center gap-4 ${highlight ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
      {p.image ? (
        <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-zinc-800" />
      ) : (
        <div className="w-12 h-12 bg-zinc-800 rounded-lg flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{p.name}</p>
        {p.winReason && <p className="text-xs text-zinc-400 mt-0.5 truncate">{p.winReason}</p>}
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <span className="text-xs text-zinc-500">Inkoop: <span className="text-zinc-300">${p.cjPrice}</span></span>
          <span className="text-xs text-zinc-500">Verkoop: <span className="text-zinc-300">{p.retailPrice}</span></span>
          <span className="text-xs text-zinc-500">Marge: <span className="text-emerald-400 font-medium">{p.margin}</span></span>
          {p.soldCount > 0 && <span className="text-xs text-zinc-600">{p.soldCount}× in stores</span>}
          {p.category && <span className="text-xs text-zinc-700">{p.category}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-center mr-1">
          <div className="flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">{p.trendScore}</span>
          </div>
          <p className="text-xs text-zinc-600">win</p>
        </div>
        <button
          onClick={() => onLaunch(p)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs transition-colors font-medium"
        >
          <Rocket size={12} />
          Launch
        </button>
        <button className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs transition-colors">
          <ShoppingCart size={12} />
          Import
        </button>
      </div>
    </div>
  )
}
