'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Compass, Loader2, TrendingUp, TrendingDown, Minus,
  Search, RefreshCw, Zap, CheckCircle
} from 'lucide-react'

type Niche = {
  name: string
  keyword: string
  why: string
  opportunityScore: number
  trend: 'rising' | 'stable' | 'seasonal'
  avgMargin: string
  targetAudience: string
  priceRange?: string
  dataSignals?: string[]
}

type NicheResult = {
  niches: Niche[]
  sources: string[]
  generatedAt: string
}

const trendIcon = {
  rising: <TrendingUp size={13} className="text-emerald-400" />,
  stable: <Minus size={13} className="text-zinc-400" />,
  seasonal: <TrendingDown size={13} className="text-yellow-400" />,
}

const trendLabel = {
  rising: 'Stijgend',
  stable: 'Stabiel',
  seasonal: 'Seizoens',
}

const scoreColor = (s: number) => {
  if (s >= 8) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  if (s >= 6) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
  return 'text-zinc-400 bg-zinc-800 border-zinc-700'
}

export default function NichesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [niches, setNiches] = useState<Niche[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [generatedAt, setGeneratedAt] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/niches')
      const data: NicheResult & { error?: string } = await res.json()
      if (data.error) { setError(data.error); return }
      setNiches(data.niches || [])
      setSources(data.sources || [])
      setGeneratedAt(data.generatedAt || '')
    } catch {
      setError('Niches ophalen mislukt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function goResearch(keyword: string) {
    router.push(`/dashboard/research?keyword=${encodeURIComponent(keyword)}`)
  }

  const topNiches = niches.filter(n => n.opportunityScore >= 8)
  const otherNiches = niches.filter(n => n.opportunityScore < 8)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Niche Finder</h2>
          <p className="text-zinc-400 mt-1">Google Trends NL · Reddit r/dropshipping · CJ Dropshipping → AI vindt beste niches voor NL</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Vernieuwen
        </button>
      </div>

      {/* Data sources */}
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {sources.map(s => (
            <div key={s} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
              <CheckCircle size={11} />
              {s}
            </div>
          ))}
          {generatedAt && (
            <span className="text-xs text-zinc-600 flex items-center px-2">
              {new Date(generatedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-20 text-zinc-500">
          <Loader2 size={28} className="animate-spin mx-auto mb-4" />
          <p className="text-sm">Marktdata ophalen + AI analyse...</p>
          <p className="text-xs mt-1 text-zinc-600">Google Trends NL + Reddit + CJ — duurt ~15 sec</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && niches.length > 0 && (
        <>
          {/* Top picks */}
          {topNiches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={15} className="text-yellow-400" />
                <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">Hoogste kans nu</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topNiches.map((n, i) => <NicheCard key={i} niche={n} onResearch={goResearch} />)}
              </div>
            </div>
          )}

          {/* Other niches */}
          {otherNiches.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Overige niches</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {otherNiches.map((n, i) => <NicheCard key={i} niche={n} onResearch={goResearch} />)}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && niches.length === 0 && !error && (
        <div className="text-center py-20 text-zinc-600">
          <Compass size={40} className="mx-auto mb-3 opacity-30" />
          <p>Klik op Vernieuwen om niches te laden</p>
        </div>
      )}
    </div>
  )
}

function NicheCard({ niche, onResearch }: { niche: Niche; onResearch: (kw: string) => void }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-white">{niche.name}</h4>
          <p className="text-xs text-zinc-500 mt-0.5">{niche.targetAudience}</p>
        </div>
        <div className={`ml-3 flex-shrink-0 text-sm font-bold px-2.5 py-1 rounded-lg border ${scoreColor(niche.opportunityScore)}`}>
          {niche.opportunityScore}/10
        </div>
      </div>

      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{niche.why}</p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          {trendIcon[niche.trend]}
          <span>{trendLabel[niche.trend]}</span>
        </div>
        <div className="text-xs text-zinc-500">
          Marge: <span className="text-emerald-400 font-medium">{niche.avgMargin}</span>
        </div>
        {niche.priceRange && (
          <div className="text-xs text-zinc-500">
            Prijs: <span className="text-zinc-300">{niche.priceRange}</span>
          </div>
        )}
        <div className="text-xs text-zinc-600 font-mono bg-zinc-800 px-2 py-0.5 rounded">
          {niche.keyword}
        </div>
      </div>

      {niche.dataSignals && niche.dataSignals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {niche.dataSignals.map(s => (
            <span key={s} className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}
      <button
        onClick={() => onResearch(niche.keyword)}
        className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white py-2 rounded-lg text-xs font-medium transition-colors"
      >
        <Search size={12} />
        Onderzoek {niche.name}
      </button>
    </div>
  )
}
