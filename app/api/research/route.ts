import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'

// ─── CJ Dropshipping ─────────────────────────────────────────────────────────

async function getCJToken(): Promise<string> {
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY! }),
  })
  const data = await res.json()
  if (!data?.result) throw new Error(`CJ auth: ${JSON.stringify(data).slice(0, 200)}`)
  return data.data.accessToken
}

type CJProduct = {
  id?: string; nameEn?: string; name?: string
  sellPrice?: string; nowPrice?: string; listedNum?: number
  bigImage?: string
  threeCategoryName?: string; twoCategoryName?: string; oneCategoryName?: string
}

async function searchCJ(token: string, keyword: string): Promise<CJProduct[]> {
  const params = new URLSearchParams({ keyWord: keyword, page: '1', size: '20' })
  const res = await fetch(`${CJ_BASE}/product/listV2?${params}`, {
    headers: { 'CJ-Access-Token': token },
  })
  const data = await res.json()
  if (!data?.result) throw new Error(`CJ search: ${JSON.stringify(data).slice(0, 200)}`)

  const content = data.data?.content
  if (Array.isArray(content) && content[0]?.productList) return content[0].productList
  if (Array.isArray(content)) return content
  if (content?.productList) return content.productList
  return []
}

// ─── Google Trends via Firecrawl ─────────────────────────────────────────────

async function getGoogleTrends(keyword: string): Promise<{ score: number; context: string }> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return { score: 50, context: 'Geen trends data' }

  try {
    const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&geo=NL&hl=nl`
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ url, formats: ['markdown'], waitFor: 3000 }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) return { score: 50, context: 'Trends niet beschikbaar' }
    const data = await res.json()
    const md: string = data?.data?.markdown || data?.markdown || ''

    // Ask Claude to extract trend signal from the scraped content
    const analysis = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Uit deze Google Trends pagina voor "${keyword}" in Nederland, extraheer:
1. Een trend interesse score (0-100, waar 100 = maximaal trending)
2. Eén zin context over de trend

Pagina inhoud: ${md.slice(0, 2000)}

Antwoord ALLEEN als JSON: {"score": 75, "context": "Stijgend trend de afgelopen 3 maanden"}`,
      }],
    })

    const parsed = JSON.parse((analysis.content[0] as { text: string }).text)
    return { score: parsed.score ?? 50, context: parsed.context ?? '' }
  } catch {
    return { score: 50, context: 'Trends niet beschikbaar' }
  }
}

// ─── Main research agent ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { keyword } = await req.json()
  if (!keyword) return NextResponse.json({ error: 'Missing keyword' }, { status: 400 })

  try {
    // Parallel: CJ token + Google Trends
    const [token, trends] = await Promise.all([
      getCJToken(),
      getGoogleTrends(keyword),
    ])

    const rawProducts = await searchCJ(token, keyword)

    if (!rawProducts.length) {
      return NextResponse.json({ products: [], trends })
    }

    // AI agent: combines CJ data + trends to score winning potential
    const forScoring = rawProducts.slice(0, 12).map(p => ({
      name: p.nameEn || p.name || '',
      price: p.sellPrice || p.nowPrice || '',
      listedByStores: p.listedNum || 0,
      category: p.threeCategoryName || p.twoCategoryName || '',
    }))

    const scored = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `Je bent een dropshipping AI agent. Analyseer deze producten voor de Nederlandse markt en geef elk product een "winScore" (1-10).

Signalen om mee te wegen:
- Google Trends interesse in NL: ${trends.score}/100 — ${trends.context}
- "listedByStores" = hoeveel dropshippers dit al verkopen (meer = bewezen, maar ook meer concurrentie)
- Prijs: laag = makkelijker impulsaankoop, hoog = hogere marge
- Is het product makkelijk te adverteren op TikTok/Instagram?
- Heeft het een wow-factor of lost het een duidelijk probleem op?

Producten: ${JSON.stringify(forScoring)}

Geef ALLEEN een JSON array terug:
[{"name":"...","winScore":8,"reason":"1 zin waarom winnaar of niet"}]`,
      }],
    })

    let scores: Record<string, { score: number; reason: string }> = {}
    try {
      const scoreData = JSON.parse((scored.content[0] as { text: string }).text)
      scoreData.forEach((s: { name: string; winScore: number; reason: string }) => {
        scores[s.name.substring(0, 25)] = { score: s.winScore, reason: s.reason || '' }
      })
    } catch { /* default scores */ }

    const result = rawProducts.slice(0, 15).map(p => {
      const name = p.nameEn || p.name || 'Onbekend'
      const priceStr = String(p.sellPrice || p.nowPrice || '0')
      const costLow = parseFloat(priceStr.split('--')[0].trim()) || 0
      const retail = costLow > 0 ? costLow * 3.5 : 0

      const scoreKey = Object.keys(scores).find(k => name.startsWith(k.substring(0, 15)))
      const scoreObj = scoreKey ? scores[scoreKey] : null

      return {
        id: p.id || '',
        name,
        cjPrice: priceStr,
        retailPrice: retail > 0 ? `€${retail.toFixed(2)}` : '—',
        margin: retail > 0 ? `${Math.round(((retail - costLow) / retail) * 100)}%` : '—',
        soldCount: p.listedNum || 0,
        trendScore: scoreObj?.score ?? 6,
        winReason: scoreObj?.reason ?? '',
        source: 'CJ Dropshipping',
        image: p.bigImage,
        category: p.threeCategoryName || p.twoCategoryName || '',
      }
    }).sort((a, b) => b.trendScore - a.trendScore)

    return NextResponse.json({
      products: result,
      trends: { score: trends.score, context: trends.context },
    })
  } catch (err) {
    console.error('Research error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
