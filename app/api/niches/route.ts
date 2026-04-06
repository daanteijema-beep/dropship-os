import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── Source 1: Google Trends NL RSS ─────────────────────────────────────────
async function getGoogleTrendsNL(): Promise<{ topics: string[]; raw: string }> {
  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=NL', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    const xml = await res.text()
    const titles = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map(m => m[1])
    const traffic = [...xml.matchAll(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/g)].map(m => m[1])
    const topics = titles.map((t, i) => `${t}${traffic[i] ? ` (${traffic[i]} searches)` : ''}`).slice(0, 25)
    return { topics, raw: topics.join('\n') }
  } catch {
    return { topics: [], raw: '' }
  }
}

// ─── Source 2: Reddit r/dropshipping top posts ───────────────────────────────
async function getRedditDropshipping(): Promise<string> {
  try {
    const [topMonth, topWeek] = await Promise.all([
      fetch('https://old.reddit.com/r/dropshipping/top.json?t=month&limit=20&raw_json=1', {
        headers: { 'User-Agent': 'dropship-research/1.0' },
        signal: AbortSignal.timeout(8000),
      }),
      fetch('https://old.reddit.com/r/dropshipping/new.json?limit=15&raw_json=1', {
        headers: { 'User-Agent': 'dropship-research/1.0' },
        signal: AbortSignal.timeout(8000),
      }),
    ])

    const [monthData, weekData] = await Promise.all([topMonth.json(), topWeek.json()])

    const posts = [
      ...(monthData?.data?.children || []),
      ...(weekData?.data?.children || []),
    ]
      .map(p => ({
        title: p.data.title,
        score: p.data.score,
        text: p.data.selftext?.slice(0, 300) || '',
      }))
      .filter(p => p.title.length > 10)

    return posts
      .map(p => `[score:${p.score}] ${p.title}${p.text ? ' — ' + p.text : ''}`)
      .join('\n')
  } catch {
    return ''
  }
}

// ─── Source 3: CJ Dropshipping — multi-category hot products ────────────────
async function getCJMultiCategory(): Promise<string> {
  try {
    const authRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: process.env.CJ_API_KEY! }),
    })
    const authData = await authRes.json()
    if (!authData?.result) return ''
    const token = authData.data.accessToken

    const categories = ['massage', 'beauty device', 'fitness tracker', 'home gadget', 'hair care', 'sleep aid', 'back support', 'eye care']

    const results = await Promise.all(
      categories.map(async (kw) => {
        try {
          const params = new URLSearchParams({ keyWord: kw, page: '1', size: '5' })
          const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/listV2?${params}`, {
            headers: { 'CJ-Access-Token': token },
            signal: AbortSignal.timeout(10000),
          })
          const data = await res.json()
          if (!data?.result) return ''
          const content = data.data?.content
          let products = []
          if (Array.isArray(content) && content[0]?.productList) products = content[0].productList
          else if (Array.isArray(content)) products = content
          else if (content?.productList) products = content.productList

          return products
            .slice(0, 3)
            .map((p: { nameEn?: string; sellPrice?: string; listedNum?: number }) =>
              `${p.nameEn || ''} | $${p.sellPrice} | ${p.listedNum || 0} stores`
            )
            .join('\n')
        } catch {
          return ''
        }
      })
    )

    return results.filter(Boolean).join('\n')
  } catch {
    return ''
  }
}

export async function GET() {
  try {
    // All 3 sources in parallel
    const [trends, reddit, cjProducts] = await Promise.all([
      getGoogleTrendsNL(),
      getRedditDropshipping(),
      getCJMultiCategory(),
    ])

    const activeSources: string[] = []
    if (trends.topics.length > 0) activeSources.push('Google Trends NL')
    if (reddit.length > 100) activeSources.push('Reddit r/dropshipping')
    if (cjProducts.length > 100) activeSources.push('CJ Dropshipping (8 categorieën)')

    const prompt = `Je bent een dropshipping expert voor de Nederlandse markt. Analyseer deze real-time marktdata en geef de 10 beste dropshipping niches.

${trends.topics.length > 0 ? `### Google Trends NL — wat Nederlanders vandaag zoeken\n${trends.raw}\n` : ''}
${reddit.length > 100 ? `### Reddit r/dropshipping — wat dropshippers nu succesvol verkopen\n${reddit}\n` : ''}
${cjProducts.length > 100 ? `### CJ Dropshipping — meest beschikbare producten per categorie\n${cjProducts}\n` : ''}

Criteria voor een goede niche voor NL:
- Inkoopprijs €3–30, verkoopprijs €20–100 (60-75% marge)
- Impulsaankoop via TikTok of Meta
- Oplost een probleem OF heeft wow-factor
- Beschikbaar via CJ Dropshipping

Kijk naar patronen across de bronnen: wat wordt op Reddit genoemd ALS winnend, wat is trending in NL, wat is populair op CJ?

Geef 10 niches als JSON array (sorteer op opportunityScore hoog naar laag):
[{
  "name": "bijv. Massage Guns",
  "keyword": "CJ zoekwoord Engels",
  "why": "concrete reden gebaseerd op de data (bijv. 'Meest gekopieerd op CJ + Reddit posts noemen consistent massage products als winners')",
  "opportunityScore": 8,
  "trend": "rising" | "stable" | "seasonal",
  "avgMargin": "68%",
  "targetAudience": "bijv. '25-45, sport & wellness'",
  "priceRange": "€29–€79",
  "dataSignals": ["CJ populair", "Reddit succes stories"]
}]

Geef ALLEEN de JSON array terug.`

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (msg.content[0] as { text: string }).text
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const niches = JSON.parse(clean)

    return NextResponse.json({ niches, sources: activeSources, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('Niches error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
