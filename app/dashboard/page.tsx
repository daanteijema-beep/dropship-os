import { TrendingUp, Package, Store, Zap } from 'lucide-react'
import Link from 'next/link'

const stats = [
  { label: 'Geanalyseerde producten', value: '0', sub: 'deze week', color: 'text-blue-400' },
  { label: 'Goedgekeurde producten', value: '0', sub: 'in pipeline', color: 'text-emerald-400' },
  { label: 'Actieve stores', value: '1', sub: 'ADHD store', color: 'text-purple-400' },
  { label: 'Producten in Shopify', value: '22', sub: 'adhd-9741', color: 'text-orange-400' },
]

const quickActions = [
  { href: '/dashboard/research', label: 'Start product research', icon: TrendingUp, color: 'bg-blue-500/10 border-blue-500/20 text-blue-400', desc: 'TikTok + Google Trends + CJ analyse' },
  { href: '/dashboard/products', label: 'Producten beheren', icon: Package, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', desc: 'Importeer naar Shopify' },
  { href: '/dashboard/marketing', label: 'Marketing genereren', icon: Zap, color: 'bg-purple-500/10 border-purple-500/20 text-purple-400', desc: 'Ad copy & TikTok scripts' },
  { href: '/dashboard/stores', label: 'Store beheren', icon: Store, color: 'bg-orange-500/10 border-orange-500/20 text-orange-400', desc: 'Shopify performance' },
]

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Goedemorgen, Daan</h2>
        <p className="text-zinc-400 mt-1">Je dropshipping OS is klaar. Start met product research.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-600 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Snelle acties</h3>
      <div className="grid grid-cols-2 gap-4">
        {quickActions.map(a => (
          <Link key={a.href} href={a.href} className={`border rounded-xl p-5 flex items-start gap-4 hover:brightness-110 transition-all ${a.color}`}>
            <a.icon size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-white text-sm">{a.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
