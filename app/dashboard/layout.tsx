import Link from 'next/link'
import { BarChart2, Search, Package, Megaphone, Store, Settings, Rocket } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Overzicht', icon: BarChart2 },
  { href: '/dashboard/research', label: 'Research', icon: Search },
  { href: '/dashboard/launch', label: 'Launch Studio', icon: Rocket },
  { href: '/dashboard/products', label: 'Producten', icon: Package },
  { href: '/dashboard/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/dashboard/stores', label: 'Stores', icon: Store },
  { href: '/dashboard/settings', label: 'Instellingen', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-lg font-bold text-white tracking-tight">Dropship OS</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Winnende Producten</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">D</div>
            <span className="text-xs text-zinc-400">Daan Teijema</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
