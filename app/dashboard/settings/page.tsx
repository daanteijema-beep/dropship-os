export default function SettingsPage() {
  const connections = [
    { name: 'Shopify', detail: 'adhd-9741.myshopify.com', status: true },
    { name: 'CJ Dropshipping', detail: 'CJ5302311', status: true },
    { name: 'Apify', detail: 'ultramarine_bobby · Free', status: true },
    { name: 'Supabase', detail: 'knagzemkqtjuenlmkeff', status: true },
    { name: 'Anthropic', detail: 'claude-haiku-4-5', status: true },
    { name: 'Firecrawl', detail: 'Personal', status: true },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Instellingen</h2>
        <p className="text-zinc-400 mt-1">Gekoppelde services & configuratie</p>
      </div>

      <div className="max-w-lg space-y-2">
        {connections.map(c => (
          <div key={c.name} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{c.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{c.detail}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${c.status ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'}`}>
              {c.status ? 'Verbonden' : 'Niet verbonden'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
