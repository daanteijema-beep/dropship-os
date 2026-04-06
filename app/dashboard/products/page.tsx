'use client'
import { useEffect, useState } from 'react'
import { Package, ExternalLink, CheckCircle, Clock } from 'lucide-react'

type ShopifyProduct = {
  id: number
  title: string
  status: string
  variants: { price: string }[]
  image?: { src: string }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Producten</h2>
          <p className="text-zinc-400 mt-1">{products.length} producten in Shopify</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Laden...</div>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                {p.image ? (
                  <img src={p.image.src} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package size={16} className="m-auto mt-2.5 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{p.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">€{p.variants[0]?.price}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.status === 'active' ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={12} /> Actief</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-zinc-500"><Clock size={12} /> Concept</span>
                )}
                <a
                  href={`https://adhd-9741.myshopify.com/admin/products/${p.id}`}
                  target="_blank"
                  className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
