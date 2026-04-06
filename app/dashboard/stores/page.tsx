'use client'
import { useEffect, useState } from 'react'
import { Store, ExternalLink, Package, ShoppingBag } from 'lucide-react'

export default function StoresPage() {
  const [shopInfo, setShopInfo] = useState<{ name: string; domain: string; plan_display_name: string; currency: string; country: string } | null>(null)
  const [productCount, setProductCount] = useState(0)

  useEffect(() => {
    fetch('/api/stores').then(r => r.json()).then(d => {
      setShopInfo(d.shop)
      setProductCount(d.productCount)
    })
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Stores</h2>
        <p className="text-zinc-400 mt-1">Gekoppelde Shopify stores</p>
      </div>

      {shopInfo && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Store size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">{shopInfo.name}</p>
                <p className="text-xs text-zinc-500">{shopInfo.domain}</p>
              </div>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Actief</span>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500">Plan</p>
              <p className="text-sm text-white mt-1">{shopInfo.plan_display_name}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Valuta</p>
              <p className="text-sm text-white mt-1">{shopInfo.currency}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Producten</p>
              <p className="text-sm text-white mt-1">{productCount}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <a
              href="https://adhd-9741.myshopify.com/admin"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ExternalLink size={12} /> Admin
            </a>
            <a
              href="https://adhd-9741.myshopify.com/admin/products"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <Package size={12} /> Producten
            </a>
            <a
              href="https://adhd-9741.myshopify.com/admin/orders"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ShoppingBag size={12} /> Orders
            </a>
          </div>
        </div>
      )}

      <div className="mt-6 bg-zinc-900/50 border border-dashed border-zinc-700 rounded-xl p-6 max-w-lg flex items-center gap-4 text-zinc-600">
        <Store size={20} />
        <div>
          <p className="text-sm">Wellness Gadgets store</p>
          <p className="text-xs mt-0.5">Nog aan te maken — nieuwe Shopify store</p>
        </div>
      </div>
    </div>
  )
}
