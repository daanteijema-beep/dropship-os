'use client'
import { useState } from 'react'
import { Search, TrendingUp, Loader2, Star, ShoppingCart } from 'lucide-react'

type Product = {
  name: string
  cjPrice: string
  retailPrice: string
  margin: string
  soldCount: number
  trendScore: number
  source: string
  image?: string
}

export default function ResearchPage() {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  async function runResearch() {
    if (!keyword.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      const data = await res.json()
      setProducts(data.products || [])
    } catch {
      alert('Research mislukt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Product Research</h2>
        <p className="text-zinc-400 mt-1">Zoek op keyword — CJ data + trend score</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runResearch()}
            placeholder="bijv. red light therapy, posture corrector..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <button
          onClick={runResearch}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
          {loading ? 'Bezig...' : 'Analyseer'}
        </button>
      </div>

      {/* Results */}
      {products.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">{products.length} producten gevonden</p>
          {products.map((p, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{p.name}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-zinc-500">Inkoop: <span className="text-zinc-300">${p.cjPrice}</span></span>
                  <span className="text-xs text-zinc-500">Verkoop: <span className="text-zinc-300">{p.retailPrice}</span></span>
                  <span className="text-xs text-zinc-500">Marge: <span className="text-emerald-400 font-medium">{p.margin}</span></span>
                  <span className="text-xs text-zinc-500">{p.soldCount}x verkocht</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium">{p.trendScore}/10</span>
                </div>
                <button className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs transition-colors">
                  <ShoppingCart size={12} />
                  Importeer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="text-center py-20 text-zinc-600">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p>Voer een keyword in en klik op Analyseer</p>
        </div>
      )}
    </div>
  )
}
