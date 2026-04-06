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

// ─── Amazon via Apify e-commerce scraper ─────────────────────────────────────

type AmazonProduct = { name?: string; title?: string; price?: string | number; rating?: number; reviewsCount?: number; url?: string }

async function getAmazonProducts(keyword: string): Promise<AmazonProduct[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) return []
  try {
    // Start async run
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/apify~e-commerce-scraping-tool/runs?token=${token}&memory=256`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, marketplaces: ['www.amazon.com'], maxProductResults: 10, scrapeMode: 'AUTO' }),
      }
    )
    if (!startRes.ok) return []
    const run = await startRes.json()
    const runId = run?.data?.id
    if (!runId) return []

    // Poll up to 50s
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 10000))
      const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`)
      const pd = await poll.json()
      if (pd?.data?.status === 'SUCCEEDED') {
        const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=10`)
        return await items.json()
      }
      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pd?.data?.status)) return []
    }
    return []
  } catch {
    return []
  }
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
    // Parallel: CJ token + Google Trends + Amazon (Apify)
    const [token, trends, amazonProducts] = await Promise.all([
      getCJToken(),
      getGoogleTrends(keyword),
      getAmazonProducts(keyword),
    ])

    const rawProducts = await searchCJ(token, keyword)

    if (!rawProducts.length) {
      return NextResponse.json({ products: [], trends })
    }

    // AI agent: combines CJ + Amazon + trends to score winning potential
    const forScoring = rawProducts.slice(0, 12).map(p => ({
      name: p.nameEn || p.name || '',
      price: p.sellPrice || p.nowPrice || '',
      listedByStores: p.listedNum || 0,
      category: p.threeCategoryName || p.twoCategoryName || '',
    }))

    const amazonContext = amazonProducts.length > 0
      ? `\nAmazon.com producten voor "${keyword}" (bewijs van markt):\n` +
        amazonProducts.slice(0, 8).map((p: AmazonProduct) =>
          `- ${p.name || p.title} | ${p.price ? '$' + p.price : ''} | ${p.rating ? p.rating + '★' : ''} | ${p.reviewsCount ? p.reviewsCount + ' reviews' : ''}`
        ).join('\n')
      : ''

    const scored = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `Je bent een dropshipping AI agent. Analyseer deze CJ producten voor de Nederlandse markt en geef elk product een "winScore" (1-10).

Signalen:
- Google Trends NL: ${trends.score}/100 — ${trends.context}
- "listedByStores" = hoeveel dropshippers dit al verkopen${amazonContext}

Weeg mee: markt bewezen op Amazon? Goede marge? Impulsaankoop op TikTok/Meta? Wow-factor?

CJ Producten: ${JSON.stringify(forScoring)}

Geef ALLEEN een JSON array:
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
      amazonProducts: amazonProducts.slice(0, 8).map((p: AmazonProduct) => ({
        name: p.name || p.title || '',
        price: p.price,
        rating: p.rating,
        reviews: p.reviewsCount,
        url: p.url,
      })),
    })
  } catch (err) {
    console.error('Research error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
