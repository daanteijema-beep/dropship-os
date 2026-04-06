'use client'
import { useState } from 'react'
import { Megaphone, Loader2, Copy, Check } from 'lucide-react'

const formats = ['Meta Ad', 'TikTok Script', 'Instagram Caption', 'Product Beschrijving']

export default function MarketingPage() {
  const [product, setProduct] = useState('')
  const [format, setFormat] = useState('Meta Ad')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!product.trim()) return
    setLoading(true)
    setResult('')
    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, format }),
      })
      const data = await res.json()
      setResult(data.content || '')
    } finally {
      setLoading(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Marketing Generator</h2>
        <p className="text-zinc-400 mt-1">AI-gegenereerde content voor ads & social</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block uppercase tracking-wider">Product</label>
            <input
              value={product}
              onChange={e => setProduct(e.target.value)}
              placeholder="bijv. Red Light Therapy Masker"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block uppercase tracking-wider">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {formats.map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                    format === f
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
            {loading ? 'Genereren...' : 'Genereer'}
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-[300px] relative">
          {result ? (
            <>
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
              <button
                onClick={copy}
                className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-white transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600">
              <p className="text-sm">Resultaat verschijnt hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
